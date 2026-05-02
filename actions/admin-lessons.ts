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
  listVideoLessonsForAdmin,
} from "@/lib/db/queries/videos"
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

export async function adminRemoveVideo(videoId: string): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }
    await adminDeleteVideoLesson(videoId)
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
