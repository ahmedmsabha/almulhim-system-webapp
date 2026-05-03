"use server"

import { eq } from "drizzle-orm"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireStudentSession } from "@/actions/auth"
import { withUserDb } from "@/lib/db/client"
import { studentDeviceBindings } from "@/lib/db/schema"
import { hashDeviceToken } from "@/lib/server/device-token-hash"
import type { ActionResult } from "@/types/api"

/**
 * يربط أول جهاز بعد التحقق من كلمة المرور، ويرفض أي توكن مختلف لاحقاً حتى يعيد المشرف ضبط الجهاز.
 */
export async function syncStudentDeviceBinding(
  plainDeviceToken: string
): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const token = plainDeviceToken.trim()
    if (token.length < 16) {
      return actionFailure("معرّف الجهاز غير صالح", "VALIDATION_ERROR")
    }

    const accessToken = gate.data.accessToken

    const hash = hashDeviceToken(token)
    const studentId = gate.data.profile.id

    await withUserDb(accessToken, async (db) => {
      const [row] = await db
        .select()
        .from(studentDeviceBindings)
        .where(eq(studentDeviceBindings.student_id, studentId))
        .limit(1)

      if (!row) {
        await db.insert(studentDeviceBindings).values({
          student_id: studentId,
          token_hash: hash,
        })
        return
      }

      if (row.token_hash !== hash) {
        throw new Error("DEVICE_MISMATCH")
      }

      await db
        .update(studentDeviceBindings)
        .set({ updated_at: new Date() })
        .where(eq(studentDeviceBindings.student_id, studentId))
    })

    return actionSuccess({ ok: true })
  } catch (e) {
    if (e instanceof Error && e.message === "DEVICE_MISMATCH") {
      return actionFailure(
        "هذا الحساب مرتبط بجهاز آخر. تواصل مع المدرس لإعادة ضبط الجهاز.",
        "FORBIDDEN"
      )
    }
    return mapCaughtErrorToAction(e)
  }
}
