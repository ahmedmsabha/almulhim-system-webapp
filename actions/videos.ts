"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireStudentSession } from "@/actions/auth"
import {
  getSubscriberVideos,
  getVideoWithAccess,
  upsertWatchProgress,
} from "@/lib/db/queries/videos"
import type { ActionResult } from "@/types/api"
import type { VideoLesson } from "@/types"

export async function getVideos(): Promise<ActionResult<VideoLesson[]>> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const data = await getSubscriberVideos(gate.data.accessToken)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function getVideoById(
  videoId: string
): Promise<ActionResult<VideoLesson>> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const data = await getVideoWithAccess(videoId, gate.data.accessToken)
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
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    await upsertWatchProgress(
      gate.data.profile.id,
      input.lessonId,
      input.secondsWatched,
      input.progressPercent,
      input.completed,
      gate.data.accessToken
    )
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
