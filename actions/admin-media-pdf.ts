"use server"

import { randomUUID } from "node:crypto"

import { z } from "zod"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import {
  adminCreatePdfMaterial,
  adminUpdatePdfMaterial,
  getPdfMaterialById,
} from "@/lib/db/queries/pdfs"
import { countPdfPagesFromBuffer } from "@/lib/media/pdf-page-count"
import { env } from "@/lib/env"
import { createSupabaseForSignedStorageOps } from "@/lib/supabase/storage-admin-client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ActionResult } from "@/types/api"
import type { PDFMaterial } from "@/types"

const MATERIALS_BUCKET = "materials"

const uuidPdfPathRegex =
  /^pdfs\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i

const categorySchema = z.enum(["شرح", "تمارين", "امتحانات", "حلول", "ملخصات"])

function assertUuidPdfStoragePath(path: string): string {
  const trimmed = path.trim()
  if (!uuidPdfPathRegex.test(trimmed)) {
    throw new Error("مسار التخزين غير صالح")
  }
  return trimmed
}

function encodedObjectPathSegments(storagePath: string): string {
  return storagePath
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/")
}

function materialsPublicObjectUrl(storagePath: string): string {
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")
  return `${base}/storage/v1/object/public/${MATERIALS_BUCKET}/${encodedObjectPathSegments(storagePath)}`
}

/** تنزيل عبر نقطة REST (يتجاوز أحياناً سلسلة عميل JS عند مشاكل Blob/المحمّل على الخادم). */
async function fetchPdfBufferViaStorageRest(
  storagePath: string,
  bearerKey: string
): Promise<{ buf: Buffer | null; status: number }> {
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")
  const pathSeg = encodedObjectPathSegments(storagePath)
  const url = `${base}/storage/v1/object/${MATERIALS_BUCKET}/${pathSeg}`
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${bearerKey}`,
      apikey: bearerKey,
    },
  })
  if (!res.ok) {
    return { buf: null, status: res.status }
  }
  return { buf: Buffer.from(await res.arrayBuffer()), status: res.status }
}

/**
 * قراءة الملف بعد الرفع لعدّ الصفحات: Storage من العميل، ثم GET عام، ثم GET مصادَق به بمفتاح الخدمة.
 */
async function fetchPdfBufferAfterUpload(
  supabase: SupabaseClient,
  storagePath: string
): Promise<Buffer | null> {
  let lastDownloadErr: string | undefined
  let publicStatus: number | undefined
  let restStatus: number | undefined

  for (let attempt = 0; attempt < 8; attempt++) {
    const dl = await supabase.storage.from(MATERIALS_BUCKET).download(storagePath)
    if (dl.error) {
      lastDownloadErr = dl.error.message
    }
    if (!dl.error && dl.data) {
      try {
        return Buffer.from(await dl.data.arrayBuffer())
      } catch (e) {
        lastDownloadErr = e instanceof Error ? e.message : String(e)
      }
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
  }

  try {
    const url = materialsPublicObjectUrl(storagePath)
    const res = await fetch(url, { cache: "no-store" })
    publicStatus = res.status
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer())
    }
  } catch (e) {
    lastDownloadErr = lastDownloadErr ?? (e instanceof Error ? e.message : String(e))
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (serviceKey) {
    try {
      const { buf, status } = await fetchPdfBufferViaStorageRest(storagePath, serviceKey)
      restStatus = status
      if (buf && buf.byteLength > 0) {
        return buf
      }
    } catch (e) {
      lastDownloadErr = lastDownloadErr ?? (e instanceof Error ? e.message : String(e))
    }
  }

  console.warn("[admin-media-pdf] تعذّر جلب PDF بعد الرفع", {
    storagePath,
    lastDownloadErr,
    publicStatus,
    restStatus,
    hasServiceRoleEnv: !!serviceKey,
    supabaseHost: env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, "").split("/")[0],
  })

  return null
}

export async function adminRequestPdfSignedUpload(): Promise<
  ActionResult<{ signedUrl: string; path: string; token: string }>
> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const path = `pdfs/${randomUUID()}.pdf`
    const supabase = await createSupabaseForSignedStorageOps()
    const { data, error } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .createSignedUploadUrl(path, { upsert: true })

    if (error || !data?.signedUrl || !data.token) {
      const hint =
        "تأكد من حاوية materials في Storage، ومن ضبط SUPABASE_SERVICE_ROLE_KEY في Vercel (Production) — المحلي يقرأ .env.local فغالباً «يشتغل عندك فقط». بدون مفتاح الخدمة قد يرفض الإنشاء على الإنتاج."
      return actionFailure(
        error?.message ? `${error.message} — ${hint}` : hint,
        "UNKNOWN"
      )
    }

    return actionSuccess({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

const commitSchema = z.object({
  storagePath: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  category: categorySchema,
  fileSizeBytes: z.number().int().positive(),
  mode: z.enum(["create", "update"]),
  materialId: z.string().uuid().optional(),
})

export async function adminCommitPdfFromStorage(
  raw: z.infer<typeof commitSchema>
): Promise<ActionResult<PDFMaterial>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const input = commitSchema.parse(raw)
    const storagePath = assertUuidPdfStoragePath(input.storagePath)

    if (input.mode === "update") {
      if (!input.materialId) {
        return actionFailure("معرّف الملف مطلوب عند التحديث", "VALIDATION_ERROR")
      }
      const existing = await getPdfMaterialById(input.materialId)
      if (!existing) {
        return actionFailure("الملف غير موجود", "NOT_FOUND")
      }
    }

    const supabase = await createSupabaseForSignedStorageOps()

    const buf = await fetchPdfBufferAfterUpload(supabase, storagePath)

    if (!buf) {
      return actionFailure(
        "تعذّر تنزيل نسخة الملف من التخزين لعدّ الصفحات. تحقّق من وجود الكائن تحت الحاوية materials بنفس المسار، وأن NEXT_PUBLIC_SUPABASE_URL لمشروع واحد مع المفتاح، وأن SUPABASE_SERVICE_ROLE_KEY مضبوط أيضاً في بيئة الاستضافة (مثل Vercel) وليس فقط في .env.local. راجع سجل الطرفية (تحذير [admin-media-pdf]).",
        "UNKNOWN"
      )
    }

    const pageCount = await countPdfPagesFromBuffer(buf)

    const { data: pub } = supabase.storage.from(MATERIALS_BUCKET).getPublicUrl(storagePath)
    const fileUrl = pub.publicUrl

    if (input.mode === "create") {
      const row = await adminCreatePdfMaterial({
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        file_url: fileUrl,
        file_size: input.fileSizeBytes,
        page_count: pageCount,
        is_published: true,
      })
      return actionSuccess(row)
    }

    const updated = await adminUpdatePdfMaterial(input.materialId!, {
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      file_url: fileUrl,
      file_size: input.fileSizeBytes,
      page_count: pageCount,
    })
    if (!updated) {
      return actionFailure("تعذّر تحديث السجل", "NOT_FOUND")
    }
    return actionSuccess(updated)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
