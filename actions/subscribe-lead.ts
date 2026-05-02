"use server"

import { z } from "zod"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { adminDb } from "@/lib/db/client"
import { subscriptionLeads } from "@/lib/db/schema"
import type { ActionResult } from "@/types/api"

const leadSchema = z.object({
  studentName: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(6).max(40),
  grade: z.string().trim().min(1).max(200),
  planId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
})

export async function submitSubscriptionLead(
  raw: z.infer<typeof leadSchema>
): Promise<ActionResult<{ ok: true }>> {
  try {
    const input = leadSchema.parse(raw)

    await adminDb.insert(subscriptionLeads).values({
      student_name: input.studentName,
      phone: input.phone,
      grade: input.grade,
      plan_id: input.planId && input.planId.length > 0 ? input.planId : null,
      notes: input.notes?.trim() || null,
    })

    return actionSuccess({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("subscription_leads") || msg.includes("app_setting")) {
      return actionFailure(
        "تعذّر تسجيل الطلب — تأكد من تشغيل سكربت قاعدة البيانات scripts/009-public-settings-and-leads.sql",
        "DATABASE_ERROR"
      )
    }
    return mapCaughtErrorToAction(e)
  }
}
