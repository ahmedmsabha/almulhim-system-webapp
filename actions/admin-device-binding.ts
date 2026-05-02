"use server"

import { eq } from "drizzle-orm"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import { adminDb } from "@/lib/db/client"
import { profiles, studentDeviceBindings } from "@/lib/db/schema"
import type { ActionResult } from "@/types/api"

export async function adminResetStudentDeviceBinding(
  studentId: string
): Promise<ActionResult<{ cleared: boolean }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const id = studentId.trim()
    if (!id) {
      return actionFailure("معرّف الطالب مطلوب", "VALIDATION_ERROR")
    }

    const [student] = await adminDb
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1)

    if (!student || student.role !== "student") {
      return actionFailure("الطالب غير موجود", "NOT_FOUND")
    }

    await adminDb.delete(studentDeviceBindings).where(eq(studentDeviceBindings.student_id, id))
    return actionSuccess({ cleared: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
