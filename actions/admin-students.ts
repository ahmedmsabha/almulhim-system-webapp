"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import { mapProfileRowToDemoStudent } from "@/lib/admin/map-demo-student"
import { listStudentsWithSubscriptions } from "@/lib/db/queries/students"
import type { ActionResult } from "@/types/api"
import type { DemoStudent } from "@/types"

export async function adminListDemoStudents(): Promise<ActionResult<DemoStudent[]>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const rows = await listStudentsWithSubscriptions()
    return actionSuccess(rows.map(mapProfileRowToDemoStudent))
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
