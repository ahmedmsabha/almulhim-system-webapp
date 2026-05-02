import "server-only"

import { TEACHER_CONTACT } from "@/lib/config"
import { getAppSetting, type AppSettingDTO } from "@/lib/db/queries/site-settings"
import { getSubscriptionPlans } from "@/lib/supabase/queries"
import type { SubscriptionPlan } from "@/types"

export type SubscribePagePayload = {
  plans: SubscriptionPlan[]
  setting: AppSettingDTO
  whatsappHref: string | undefined
  telegramHref: string | undefined
}

export async function loadSubscribePageData(): Promise<SubscribePagePayload> {
  const [plans, setting] = await Promise.all([getSubscriptionPlans(), getAppSetting()])

  const whatsappHref =
    setting.whatsapp_url?.trim() || TEACHER_CONTACT.whatsappUrl || undefined
  const telegramHref =
    setting.telegram_url?.trim() || TEACHER_CONTACT.telegramUrl || undefined

  return { plans, setting, whatsappHref, telegramHref }
}
