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
  buildCloudflareStreamLessonManifestUrl,
  createDirectCreatorTusUploadSlot,
  isCloudflareStreamUploadConfigured,
} from "@/lib/stream/cloudflare-stream"
import type { ActionResult } from "@/types/api"
import type { VideoLesson } from "@/types"

const MAX_SOURCE_BYTES = 4 * 1024 * 1024 * 1024

const createUploadSchema = z.object({
  lessonId: z.string().uuid(),
  fileSizeBytes: z.number().int().positive().max(MAX_SOURCE_BYTES),
  fileName: z.string().min(1).max(280),
  contentType: z.string().min(1).max(120),
})

const finalizeSchema = z.object({
  lessonId: z.string().uuid(),
  videoUid: z.string().min(16).max(80).regex(/^[a-zA-Z0-9_-]+$/),
})

function sanitizeMetaFileName(raw: string): string {
  const base = raw.replace(/\\/g, "/").split("/").pop() || "video"
  const cleaned = base.replace(/[^\w.\s-]/g, "_").slice(0, 120)
  return cleaned.length ? cleaned : "video.mp4"
}

export async function adminCreateStreamUploadUrl(input: {
  lessonId: string
  fileSizeBytes: number
  fileName: string
  contentType: string
}): Promise<ActionResult<{ uploadUrl: string; videoUid: string }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    if (!isCloudflareStreamUploadConfigured()) {
      return actionFailure(
        "رفع Stream غير مفعّل: اضبط CF_STREAM_TOKEN و CF_STREAM_ACCOUNT_ID و NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE.",
        "UNKNOWN"
      )
    }

    const parsed = createUploadSchema.parse(input)

    const lesson = await getVideoById(parsed.lessonId)
    if (!lesson) {
      return actionFailure("الدرس غير موجود", "NOT_FOUND")
    }

    const ct = parsed.contentType.trim() || "application/octet-stream"
    if (ct !== "application/octet-stream" && !ct.startsWith("video/")) {
      return actionFailure("نوع الملف يجب أن يكون فيديو", "VALIDATION_ERROR")
    }

    const putCt = ct === "application/octet-stream" || !ct.startsWith("video/") ? "video/mp4" : ct

    const slot = await createDirectCreatorTusUploadSlot({
      uploadLengthBytes: parsed.fileSizeBytes,
      fileName: sanitizeMetaFileName(parsed.fileName),
      contentType: putCt,
    })

    return actionSuccess(slot)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminFinalizeStreamLesson(input: {
  lessonId: string
  videoUid: string
}): Promise<ActionResult<VideoLesson | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    if (!isCloudflareStreamUploadConfigured()) {
      return actionFailure("Stream غير مُهيأ على الخادم.", "UNKNOWN")
    }

    const parsed = finalizeSchema.parse(input)

    const customerCode = process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE?.trim()
    if (!customerCode) {
      return actionFailure("NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE غير مضبوط.", "UNKNOWN")
    }

    const lesson = await getVideoById(parsed.lessonId)
    if (!lesson) {
      return actionFailure("الدرس غير موجود", "NOT_FOUND")
    }

    const hlsUrl = buildCloudflareStreamLessonManifestUrl(customerCode, parsed.videoUid)
    const updated = await adminUpdateVideoLesson(parsed.lessonId, { hls_url: hlsUrl })
    return actionSuccess(updated)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
