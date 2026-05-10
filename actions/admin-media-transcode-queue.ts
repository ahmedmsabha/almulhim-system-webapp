"use server"

import { z } from "zod"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import { getPublicSiteUrl } from "@/lib/config"
import { getVideoById } from "@/lib/db/queries/videos"
import {
  isTranscoderWorkerQueueConfigured,
} from "@/lib/server/transcoder-worker-config"
import { isR2Configured } from "@/lib/storage/r2-hls-presign"
import type { ActionResult } from "@/types/api"

const queueSchema = z.object({
  lessonId: z.string().uuid(),
  sourceR2Key: z.string().min(1).max(2048),
})

function isExpectedSourceKey(lessonId: string, sourceR2Key: string): boolean {
  const pref = `hls/${lessonId}/_source/`
  if (!sourceR2Key.startsWith(pref) || sourceR2Key.includes("..")) return false
  const rest = sourceR2Key.slice(pref.length)
  return Boolean(rest && !rest.includes("/"))
}

export async function adminQueueTranscodeJob(input: {
  lessonId: string
  sourceR2Key: string
}): Promise<ActionResult<{ queued: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    if (!isTranscoderWorkerQueueConfigured()) {
      return actionFailure(
        "صف تحويل الخلفية غير مفعّل: اضبط TRANSCODER_WORKER_URL و TRANSCODER_WEBHOOK_SECRET ويُفضّل NEXT_PUBLIC_BASE_URL (أو VERCEL_URL) لعنوان الاستدعاء.",
        "UNKNOWN"
      )
    }

    if (!isR2Configured()) {
      return actionFailure("R2 غير مُهيأ على الخادم.", "UNKNOWN")
    }

    const parsed = queueSchema.parse(input)

    if (!isExpectedSourceKey(parsed.lessonId, parsed.sourceR2Key)) {
      return actionFailure(
        "مسار المصدر غير صالح: يجب أن يكون تحت hls/{معرّف الدرس}/_source/ بملف واحد.",
        "VALIDATION_ERROR"
      )
    }

    const lesson = await getVideoById(parsed.lessonId)
    if (!lesson) {
      return actionFailure("الدرس غير موجود", "NOT_FOUND")
    }

    const workerBase = process.env.TRANSCODER_WORKER_URL!.trim().replace(/\/$/, "")
    const ingestUrl = workerBase.endsWith("/transcode") ? workerBase : `${workerBase}/transcode`
    const webhookSecret = process.env.TRANSCODER_WEBHOOK_SECRET!.trim()
    const webhookUrl = `${getPublicSiteUrl()}/api/transcode-webhook`
    const body = {
      lessonId: parsed.lessonId,
      sourceKey: parsed.sourceR2Key,
      webhookUrl,
      webhookSecret,
    }

    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      let detail = ""
      try {
        detail = await res.text()
      } catch {
        /* ignore */
      }
      return actionFailure(
        `رفض خادم التحويل (HTTP ${String(res.status)})${detail ? `: ${detail.slice(0, 400)}` : ""}`,
        "UNKNOWN"
      )
    }

    return actionSuccess({ queued: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
