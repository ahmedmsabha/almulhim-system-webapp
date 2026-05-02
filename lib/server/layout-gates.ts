import "server-only"

import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/lib/supabase/auth"
import { ensureProfileRow } from "@/lib/supabase/ensure-profile"
import { createClient } from "@/lib/supabase/server"
import { getLatestSubscriptionForStudent } from "@/lib/db/queries/subscriptions-read"
import type { Profile, Subscription, StudentSubscriptionUiStatus } from "@/types"

function studentSubscriptionUiStatus(
  subscription: Subscription | null
): StudentSubscriptionUiStatus {
  if (!subscription) return "none"
  if (
    subscription.status === "expired" ||
    subscription.status === "cancelled"
  ) {
    return "expired"
  }
  return "active"
}

export type StudentLayoutContext = {
  profile: Profile
  subscription: Subscription | null
  subscriptionStatus: StudentSubscriptionUiStatus
}

export async function requireStudentLayoutContext(): Promise<StudentLayoutContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  await ensureProfileRow(user)
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.role !== "student") redirect("/admin")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  let subscription: Subscription | null = null
  if (session?.access_token) {
    try {
      subscription = await getLatestSubscriptionForStudent(session.access_token)
    } catch {
      subscription = null
    }
  }

  const subscriptionStatus = studentSubscriptionUiStatus(subscription)
  return { profile, subscription, subscriptionStatus }
}

/** صفحات الدروس والملفات وغيرها — يقتصر الوصول على اشتراك فعّال (يشمل «ينتهي قريباً»). */
export async function requireStudentContentAccess(): Promise<StudentLayoutContext> {
  const ctx = await requireStudentLayoutContext()
  if (ctx.subscriptionStatus !== "active") {
    redirect("/student")
  }
  return ctx
}

export async function requireAdminLayoutContext(): Promise<{ profile: Profile }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  await ensureProfileRow(user)
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.role !== "admin") redirect("/student")

  return { profile }
}
