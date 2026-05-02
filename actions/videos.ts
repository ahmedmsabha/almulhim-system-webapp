"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { getSessionAccessToken, requireStudent } from "@/actions/auth"
import {
  getSubscriberVideos,
  getVideoWithAccess,
  upsertWatchProgress,
} from "@/lib/db/queries/videos"
import type { ActionResult } from "@/types/api"
import type { VideoLesson } from "@/types"

export async function getVideos(): Promise<ActionResult<VideoLesson[]>> {
  try {
    const gate = await requireStudent()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const token = await getSessionAccessToken()
    if (!token) {
      return actionFailure("انتهت الجلسة", "UNAUTHORIZED")
    }

    const data = await getSubscriberVideos(token)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function getVideoById(
  videoId: string
): Promise<ActionResult<VideoLesson>> {
  try {
    const token = await getSessionAccessToken()
    if (!token) {
      return actionFailure("يجب تسجيل الدخول", "UNAUTHORIZED")
    }

    const data = await getVideoWithAccess(videoId, token)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function updateProgress(input: {
  lessonId: string
  secondsWatched: number
  progressPercent: number
  completed: boolean
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireStudent()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const token = await getSessionAccessToken()
    if (!token) {
      return actionFailure("انتهت الجلسة", "UNAUTHORIZED")
    }

    await upsertWatchProgress(
      gate.data.id,
      input.lessonId,
      input.secondsWatched,
      input.progressPercent,
      input.completed,
      token
    )
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
