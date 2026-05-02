"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import {
  activateSubscription as activateSubscriptionDb,
  assertSubscriptionOwnedByStudent,
  deactivateSubscription as deactivateSubscriptionDb,
  getAllStudents as fetchAllStudents,
  updateSubscriptionRecord,
} from "@/lib/db/queries/students"
import type { ActionResult } from "@/types/api"
import type { Profile } from "@/types"

export async function getAllStudents(): Promise<ActionResult<Profile[]>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const data = await fetchAllStudents()
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function activateSubscription(input: {
  userId: string
  planId: string
  startDateIso: string
  endDateIso: string
  activatedBy?: string | null
  notes?: string | null
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const start = new Date(input.startDateIso)
    const end = new Date(input.endDateIso)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return actionFailure("تواريخ غير صالحة", "VALIDATION_ERROR")
    }

    await activateSubscriptionDb(
      input.userId,
      input.planId,
      start,
      end,
      input.activatedBy,
      input.notes
    )
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function saveStudentSubscriptionAdmin(input: {
  studentId: string
  subscriptionRecordId: string | null
  planId: string
  startDateIso: string
  endDateIso: string
  notes?: string | null
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const start = new Date(`${input.startDateIso}T12:00:00`)
    const end = new Date(`${input.endDateIso}T12:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return actionFailure("تواريخ غير صالحة", "VALIDATION_ERROR")
    }
    if (end.getTime() <= start.getTime()) {
      return actionFailure("تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء", "VALIDATION_ERROR")
    }

    if (!input.planId.trim()) {
      return actionFailure("اختر خطة اشتراك", "VALIDATION_ERROR")
    }

    if (input.subscriptionRecordId) {
      await assertSubscriptionOwnedByStudent(
        input.subscriptionRecordId,
        input.studentId
      )
      await updateSubscriptionRecord(input.subscriptionRecordId, {
        planId: input.planId,
        startDate: start,
        endDate: end,
        status: "active",
      })
    } else {
      await activateSubscriptionDb(
        input.studentId,
        input.planId,
        start,
        end,
        gate.data.id,
        input.notes ?? null
      )
    }

    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function deactivateStudentSubscriptionAdmin(input: {
  studentId: string
  subscriptionRecordId: string
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    await assertSubscriptionOwnedByStudent(
      input.subscriptionRecordId,
      input.studentId
    )
    await deactivateSubscriptionDb(input.subscriptionRecordId)
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function deactivateSubscription(
  subscriptionId: string
): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    await deactivateSubscriptionDb(subscriptionId)
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
