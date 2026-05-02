"use server"

import { z } from "zod"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import { upsertAppSetting } from "@/lib/db/queries/site-settings"
import {
  adminUpdateSubscriptionPlanRow,
  listSubscriptionPlansAdmin,
} from "@/lib/db/queries/subscription-plans-admin"
import { adminDb } from "@/lib/db/client"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { ActionResult } from "@/types/api"
import type { SubscriptionPlan } from "@/types"

const trimUrl = z
  .string()
  .max(2048)
  .optional()
  .transform((s) => {
    const t = (s ?? "").trim()
    return t.length ? t : null
  })

const subscribeSettingsSchema = z.object({
  whatsapp_url: trimUrl,
  telegram_url: trimUrl,
  grades_text: z.string().max(8000),
  subscribe_page_note_ar: z
    .string()
    .max(8000)
    .optional()
    .transform((s) => ((s ?? "").trim() || null)),
})

export async function adminSaveSubscribePageSettings(
  raw: z.infer<typeof subscribeSettingsSchema>
): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) return actionFailure(gate.error, gate.code)

    const input = subscribeSettingsSchema.parse(raw)
    const grades = input.grades_text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    if (!grades.length) {
      return actionFailure("أدخل صفاً واحداً على الأقل (سطر لكل صف)", "VALIDATION_ERROR")
    }

    await upsertAppSetting({
      whatsapp_url: input.whatsapp_url,
      telegram_url: input.telegram_url,
      grades,
      subscribe_page_note_ar: input.subscribe_page_note_ar,
    })

    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

const planUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim()
      return t.length ? t : null
    }),
  duration_days: z.number().int().min(1).max(2000),
  price: z.number().min(0).max(1_000_000),
  is_active: z.boolean(),
})

export async function adminSaveSubscriptionPlan(
  raw: z.infer<typeof planUpdateSchema>
): Promise<ActionResult<SubscriptionPlan>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) return actionFailure(gate.error, gate.code)

    const input = planUpdateSchema.parse(raw)
    const existing = (await listSubscriptionPlansAdmin()).find((p) => p.id === input.id)
    if (!existing) {
      return actionFailure("الخطة غير موجودة", "NOT_FOUND")
    }

    const updated = await adminUpdateSubscriptionPlanRow(input.id, {
      name: input.name,
      description: input.description,
      duration_days: input.duration_days,
      price: input.price,
      is_active: input.is_active,
    })

    if (!updated) {
      return actionFailure("تعذّر حفظ الخطة", "DATABASE_ERROR")
    }

    return actionSuccess(updated)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(40),
})

export async function adminSaveProfileSettings(
  raw: z.infer<typeof profileSchema>
): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) return actionFailure(gate.error, gate.code)

    const input = profileSchema.parse(raw)

    await adminDb
      .update(profiles)
      .set({
        full_name: input.full_name,
        phone: input.phone,
        updated_at: new Date(),
      })
      .where(eq(profiles.id, gate.data.id))

    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
