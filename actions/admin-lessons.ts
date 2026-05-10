"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import {
  adminCreateVideoLesson,
  adminDeleteVideoLesson,
  adminUpdateVideoLesson,
  getVideoById,
  listVideoLessonsForAdmin,
} from "@/lib/db/queries/videos"
import {
  isR2Configured,
  isUrlUnderR2PublicBase,
  lessonHlsObjectPrefix,
  masterObjectKeyBelongsToLesson,
  r2DeleteObjectsWithPrefix,
} from "@/lib/storage/r2-hls-presign"
import type { ActionResult } from "@/types/api"
import type { VideoLesson } from "@/types"

export async function adminListVideos(): Promise<ActionResult<VideoLesson[]>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }
    const data = await listVideoLessonsForAdmin()
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminCreateVideo(
  input: Parameters<typeof adminCreateVideoLesson>[0]
): Promise<ActionResult<VideoLesson>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }
    const data = await adminCreateVideoLesson(input)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminUpdateVideo(
  id: string,
  input: Parameters<typeof adminUpdateVideoLesson>[1]
): Promise<ActionResult<VideoLesson | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }
    const data = await adminUpdateVideoLesson(id, input)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminGetVideoById(
  id: string,
): Promise<ActionResult<VideoLesson | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }
    const data = await getVideoById(id)
    if (!data) {
      return actionFailure("الدرس غير موجود", "NOT_FOUND")
    }
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminRemoveVideo(
  videoId: string
): Promise<ActionResult<{ ok: true; r2Removed?: number }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const lesson = await getVideoById(videoId)
    if (!lesson) {
      return actionFailure("الدرس غير موجود", "NOT_FOUND")
    }

    let r2Removed: number | undefined
    if (
      isR2Configured() &&
      lesson.hls_url &&
      isUrlUnderR2PublicBase(lesson.hls_url) &&
      masterObjectKeyBelongsToLesson(videoId, lesson.hls_url)
    ) {
      r2Removed = await r2DeleteObjectsWithPrefix(lessonHlsObjectPrefix(videoId))
    }

    await adminDeleteVideoLesson(videoId)
    return actionSuccess({ ok: true, r2Removed })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
