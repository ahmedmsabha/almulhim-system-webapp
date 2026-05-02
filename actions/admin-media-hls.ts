"use server"

import { z } from "zod"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import { adminUpdateVideoLesson, getVideoById } from "@/lib/db/queries/videos"
import {
  getR2PublicBaseUrl,
  isR2BrowserUploadConfigured,
  presignR2PutObject,
} from "@/lib/storage/r2-hls-presign"
import type { ActionResult } from "@/types/api"
import type { VideoLesson } from "@/types"

const HLS_BATCH_MAX = 100

function normalizeRelativePath(raw: string): string {
  const n = raw
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .trim()
  if (!n || n.includes("..")) {
    throw new Error("مسار الملف غير صالح")
  }
  if (n.length > 480) {
    throw new Error("مسار الملف طويل جداً")
  }
  return n
}

function guessContentType(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith(".m3u8")) return "application/vnd.apple.mpegurl"
  if (lower.endsWith(".ts")) return "video/mp2t"
  if (lower.endsWith(".mp4")) return "video/mp4"
  if (lower.endsWith(".vtt")) return "text/vtt"
  return "application/octet-stream"
}

function publicUrlForObjectKey(objectKey: string): string | null {
  const base = getR2PublicBaseUrl()
  if (!base) return null
  const path = objectKey
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/")
  return `${base.replace(/\/$/, "")}/${path}`
}

const batchItemSchema = z.object({
  relativePath: z.string().min(1),
  contentType: z.string().min(1).optional(),
})

export async function adminPresignHlsPartUploads(
  lessonId: string,
  items: z.infer<typeof batchItemSchema>[]
): Promise<
  ActionResult<Array<{ relativePath: string; signedUrl: string; objectKey: string }>>
> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    if (!isR2BrowserUploadConfigured()) {
      return actionFailure(
        "رفع الفيديو إلى R2 غير مفعّل: اضبط R2_ACCOUNT_ID و R2_ACCESS_KEY_ID و R2_SECRET_ACCESS_KEY و R2_BUCKET_NAME و NEXT_PUBLIC_R2_PUBLIC_BASE_URL (الدومين العام للملفات).",
        "UNKNOWN"
      )
    }

    const lesson = await getVideoById(lessonId)
    if (!lesson) {
      return actionFailure("الدرس غير موجود", "NOT_FOUND")
    }

    if (!items.length || items.length > HLS_BATCH_MAX) {
      return actionFailure(
        `يجب أن يكون عدد الملفات بين 1 و ${HLS_BATCH_MAX} في كل طلب`,
        "VALIDATION_ERROR"
      )
    }

    const parsed = z.array(batchItemSchema).parse(items)
    const out: Array<{ relativePath: string; signedUrl: string; objectKey: string }> = []

    for (const row of parsed) {
      const relativePath = normalizeRelativePath(row.relativePath)
      const contentType = row.contentType?.trim() || guessContentType(relativePath)
      const objectKey = `hls/${lessonId}/${relativePath}`
      const signedUrl = await presignR2PutObject(objectKey, contentType)
      out.push({ relativePath, signedUrl, objectKey })
    }

    return actionSuccess(out)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminFinalizeLessonHlsFromUpload(
  lessonId: string,
  masterRelativePath: string
): Promise<ActionResult<VideoLesson | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    if (!isR2BrowserUploadConfigured()) {
      return actionFailure(
        "إعدادات R2 أو عنوان CDN العام غير مكتملة.",
        "UNKNOWN"
      )
    }

    const lesson = await getVideoById(lessonId)
    if (!lesson) {
      return actionFailure("الدرس غير موجود", "NOT_FOUND")
    }

    const relativePath = normalizeRelativePath(masterRelativePath)
    const objectKey = `hls/${lessonId}/${relativePath}`
    const hlsUrl = publicUrlForObjectKey(objectKey)
    if (!hlsUrl) {
      return actionFailure("تعذّر بناء رابط قائمة التشغيل", "UNKNOWN")
    }

    const updated = await adminUpdateVideoLesson(lessonId, { hls_url: hlsUrl })
    return actionSuccess(updated)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
