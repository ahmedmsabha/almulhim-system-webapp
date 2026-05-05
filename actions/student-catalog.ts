"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireStudentSession } from "@/actions/auth"
import { getSubscriberVideosWithProgress } from "@/lib/db/queries/videos"
import { mergeLessonsWithProgress } from "@/lib/student-catalog-merge"
import type { ActionResult } from "@/types/api"
import type { LessonWithProgress } from "@/types"

export async function getStudentLessonsMergedAction(): Promise<
  ActionResult<LessonWithProgress[]>
> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const { lessons, progress } = await getSubscriberVideosWithProgress(gate.data.accessToken)
    return actionSuccess(mergeLessonsWithProgress(lessons, progress))
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
