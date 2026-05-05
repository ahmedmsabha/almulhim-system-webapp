"use server"

import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { requireStudentOrAdminSession } from "@/actions/auth"
import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { withUserDb } from "@/lib/db/client"
import { pushSubscriptions } from "@/lib/db/schema"
import type { ActionResult } from "@/types/api"

const saveInputSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
})

export async function savePushSubscriptionAction(input: {
  endpoint: string
  p256dh: string
  auth: string
}): Promise<ActionResult<{ id: string }>> {
  const parsed = saveInputSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure("بيانات اشتراك الدفع غير صالحة", "VALIDATION_ERROR")
  }

  try {
    const session = await requireStudentOrAdminSession()
    if (!session.success) {
      return session
    }
    const { profile, accessToken } = session.data

    const row = await withUserDb(accessToken, async (tx) => {
      const [inserted] = await tx
        .insert(pushSubscriptions)
        .values({
          user_id: profile.id,
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.p256dh,
          auth: parsed.data.auth,
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: {
            user_id: profile.id,
            p256dh: parsed.data.p256dh,
            auth: parsed.data.auth,
          },
        })
        .returning({ id: pushSubscriptions.id })

      return inserted
    })

    if (!row) {
      return actionFailure("تعذر حفظ الاشتراك", "DATABASE_ERROR")
    }
    return actionSuccess({ id: row.id })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

const endpointParamSchema = z.string().url()

export async function deletePushSubscriptionAction(
  endpoint: string
): Promise<ActionResult<{ ok: true }>> {
  const parsed = endpointParamSchema.safeParse(endpoint)
  if (!parsed.success) {
    return actionFailure("عنوان الاشتراك غير صالح", "VALIDATION_ERROR")
  }

  try {
    const session = await requireStudentOrAdminSession()
    if (!session.success) {
      return session
    }
    const { profile, accessToken } = session.data

    await withUserDb(accessToken, async (tx) => {
      await tx
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.endpoint, parsed.data),
            eq(pushSubscriptions.user_id, profile.id)
          )
        )
    })

    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
