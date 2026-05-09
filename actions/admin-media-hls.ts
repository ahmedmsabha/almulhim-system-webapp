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
  isMultivariantMaster,
  parseMasterPlaylist,
  rebuildMasterPlaylist,
  variantDisplayLabel,
} from "@/lib/hls/master-playlist"
import {
  getR2PublicBaseUrl,
  isR2Configured,
  isUrlUnderR2PublicBase,
  masterObjectKeyBelongsToLesson,
  objectKeyFromHlsMasterUrl,
  presignR2PutObject,
  r2GetObjectUtf8,
  r2PutObjectUtf8,
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

    if (!isR2Configured()) {
      return actionFailure(
        "رفع الفيديو إلى R2 غير مفعّل: اضبط R2_ACCOUNT_ID و R2_ACCESS_KEY_ID و R2_SECRET_ACCESS_KEY و R2_BUCKET_NAME. للرفع من المتصفح أو التطبيق فعّل CORS على الحاوية للسماح بـ PUT من أصل موقعك.",
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

    if (!isR2Configured()) {
      return actionFailure("R2 غير مُهيأ على الخادم.", "UNKNOWN")
    }

    const lesson = await getVideoById(lessonId)
    if (!lesson) {
      return actionFailure("الدرس غير موجود", "NOT_FOUND")
    }

    const relativePath = normalizeRelativePath(masterRelativePath)
    const objectKey = `hls/${lessonId}/${relativePath}`
    const hlsUrl = publicUrlForObjectKey(objectKey)
    if (!hlsUrl) {
      return actionFailure(
        "تعذّر بناء رابط master العام. عيّن NEXT_PUBLIC_R2_PUBLIC_BASE_URL (دومين R2 العام) ثم أعد المحاولة — الملفات قد تكون مرفوعة لكن التشغيل يحتاج هذا العنوان.",
        "UNKNOWN"
      )
    }

    const updated = await adminUpdateVideoLesson(lessonId, { hls_url: hlsUrl })
    return actionSuccess(updated)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

const variantUrisSchema = z.array(z.string().min(1)).min(1)

export async function adminGetLessonHlsVariants(
  lessonId: string
): Promise<
  ActionResult<{
    variants: Array<{ uri: string; label: string; streamInfLine: string }>
  }>
> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    if (!isR2Configured()) {
      return actionFailure("R2 غير مُهيأ على الخادم", "UNKNOWN")
    }

    const lesson = await getVideoById(lessonId)
    if (!lesson?.hls_url) {
      return actionFailure("لا يوجد رابط HLS لهذا الدرس", "NOT_FOUND")
    }

    if (
      !isUrlUnderR2PublicBase(lesson.hls_url) ||
      !masterObjectKeyBelongsToLesson(lessonId, lesson.hls_url)
    ) {
      return actionFailure(
        "يُدعم تعديل الجودات فقط لملفات master المخزّنة على R2 تحت المسار hls/{معرّف الدرس}/… (كما في الرفع من التطبيق).",
        "VALIDATION_ERROR"
      )
    }

    const masterKey = objectKeyFromHlsMasterUrl(lesson.hls_url)
    if (!masterKey) {
      return actionFailure("رابط master غير صالح", "VALIDATION_ERROR")
    }

    const text = await r2GetObjectUtf8(masterKey)
    if (!isMultivariantMaster(text)) {
      return actionFailure(
        "هذا الملف ليس master متعدد الجودات (لا يحتوي EXT-X-STREAM-INF). ارفع مجلداً يتضمن master.m3u8 بعدة جودات.",
        "VALIDATION_ERROR"
      )
    }

    const parsed = parseMasterPlaylist(text)
    if (!parsed.variants.length) {
      return actionFailure("لم يُعثر على جودات في قائمة التشغيل", "VALIDATION_ERROR")
    }

    const variants = parsed.variants.map((v) => ({
      uri: v.uri,
      label: variantDisplayLabel(v.streamInfLine, v.uri),
      streamInfLine: v.streamInfLine,
    }))

    return actionSuccess({ variants })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminSaveLessonHlsVariants(
  lessonId: string,
  selectedUris: string[]
): Promise<ActionResult<VideoLesson | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    if (!isR2Configured()) {
      return actionFailure("R2 غير مُهيأ على الخادم", "UNKNOWN")
    }

    const uris = variantUrisSchema.parse(selectedUris)

    const lesson = await getVideoById(lessonId)
    if (!lesson?.hls_url) {
      return actionFailure("لا يوجد رابط HLS لهذا الدرس", "NOT_FOUND")
    }

    if (
      !isUrlUnderR2PublicBase(lesson.hls_url) ||
      !masterObjectKeyBelongsToLesson(lessonId, lesson.hls_url)
    ) {
      return actionFailure(
        "لا يمكن حفظ الجودات إلا لملفات master على مسار الدرس في R2.",
        "VALIDATION_ERROR"
      )
    }

    const masterKey = objectKeyFromHlsMasterUrl(lesson.hls_url)
    if (!masterKey) {
      return actionFailure("رابط master غير صالح", "VALIDATION_ERROR")
    }

    const text = await r2GetObjectUtf8(masterKey)
    if (!isMultivariantMaster(text)) {
      return actionFailure("الملف ليس master متعدد الجودات", "VALIDATION_ERROR")
    }

    const parsed = parseMasterPlaylist(text)
    const byUri = new Map(parsed.variants.map((v) => [v.uri, v]))
    const ordered: typeof parsed.variants = []
    for (const u of uris) {
      const row = byUri.get(u)
      if (!row) {
        return actionFailure(`مسار جودة غير موجود في القائمة الحالية: ${u}`, "VALIDATION_ERROR")
      }
      ordered.push(row)
    }

    const rebuilt = rebuildMasterPlaylist(parsed, ordered)
    await r2PutObjectUtf8(masterKey, rebuilt, "application/vnd.apple.mpegurl")
    const updated = await adminUpdateVideoLesson(lessonId, { hls_url: lesson.hls_url })
    return actionSuccess(updated)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
