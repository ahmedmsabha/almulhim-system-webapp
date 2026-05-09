"use server"

import { z } from "zod"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import { getVideoById } from "@/lib/db/queries/videos"
import { isR2Configured, presignR2PutObject } from "@/lib/storage/r2-hls-presign"
import {
  assertValidSourceRelativePath,
  transcodeLessonSourceOnServer,
} from "@/lib/video/transcode-lesson-hls"
import type { ActionResult } from "@/types/api"
import type { VideoLesson } from "@/types"

const MAX_SOURCE_BYTES = 4 * 1024 * 1024 * 1024

function sanitizeSourceFileName(raw: string): string {
  const base = raw.replace(/\\/g, "/").split("/").pop() || "video"
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
  const withExt = cleaned.length ? cleaned : "video.mp4"
  if (!/\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(withExt)) {
    return `${withExt}.mp4`
  }
  return withExt
}

export async function adminPresignLessonSourceVideoUpload(
  lessonId: string,
  fileName: string,
  contentType: string,
  byteSize: number
): Promise<ActionResult<{ signedUrl: string; relativePath: string; contentType: string }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    if (!isR2Configured()) {
      return actionFailure(
        "رفع الفيديو يتطلب إعداد R2 على الخادم (المعرّف والمفاتيح واسم الحاوية). للرفع من المتصفح فعّل CORS على الحاوية للسماح بـ PUT.",
        "UNKNOWN"
      )
    }

    const lesson = await getVideoById(lessonId)
    if (!lesson) {
      return actionFailure("الدرس غير موجود", "NOT_FOUND")
    }

    if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > MAX_SOURCE_BYTES) {
      return actionFailure(
        `حجم الملف يجب أن يكون أكبر من صفر وأصغر من ${Math.floor(MAX_SOURCE_BYTES / (1024 * 1024 * 1024))} غيغابايت`,
        "VALIDATION_ERROR"
      )
    }

    const ct = (contentType || "").trim() || "application/octet-stream"
    if (ct !== "application/octet-stream" && !ct.startsWith("video/")) {
      return actionFailure("نوع الملف يجب أن يكون فيديو", "VALIDATION_ERROR")
    }

    const safe = sanitizeSourceFileName(fileName)
    const relativePath = `_source/${safe}`
    assertValidSourceRelativePath(relativePath)

    const objectKey = `hls/${lessonId}/${relativePath}`
    const putCt =
      ct === "application/octet-stream" || !ct.startsWith("video/") ? "video/mp4" : ct
    const signedUrl = await presignR2PutObject(objectKey, putCt)

    return actionSuccess({ signedUrl, relativePath, contentType: putCt })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

const transcodeSchema = z.object({
  lessonId: z.string().uuid(),
  sourceRelativePath: z.string().min(1),
})

export async function adminTranscodeLessonUploadedVideo(
  lessonId: string,
  sourceRelativePath: string
): Promise<ActionResult<VideoLesson | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    if (process.env.DISABLE_SERVER_VIDEO_TRANSCODE === "1") {
      return actionFailure("تحويل الفيديو على الخادم معطّل", "UNKNOWN")
    }

    transcodeSchema.parse({ lessonId, sourceRelativePath })

    await transcodeLessonSourceOnServer(lessonId, sourceRelativePath)
    const updated = await getVideoById(lessonId)
    return actionSuccess(updated)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
