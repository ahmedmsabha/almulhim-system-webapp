import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

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
  /** JWT for Drizzle `withUserDb` — same request as layout, no second `getSession`. */
  accessToken: string
}

const loadStudentLayoutContext = cache(async (): Promise<StudentLayoutContext> => {
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
  const accessToken = session?.access_token
  if (!accessToken) redirect("/login")

  let subscription: Subscription | null = null
  try {
    subscription = await getLatestSubscriptionForStudent(accessToken)
  } catch {
    subscription = null
  }

  const subscriptionStatus = studentSubscriptionUiStatus(subscription)
  return { profile, subscription, subscriptionStatus, accessToken }
})

export async function requireStudentLayoutContext(): Promise<StudentLayoutContext> {
  return loadStudentLayoutContext()
}

/** صفحات الدروس والملفات وغيرها — يقتصر الوصول على اشتراك فعّال (يشمل «ينتهي قريباً»). */
export async function requireStudentContentAccess(): Promise<StudentLayoutContext> {
  const ctx = await requireStudentLayoutContext()
  if (ctx.subscriptionStatus !== "active") {
    redirect("/student")
  }
  return ctx
}

const loadAdminLayoutContext = cache(async (): Promise<{ profile: Profile }> => {
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
})

export async function requireAdminLayoutContext(): Promise<{ profile: Profile }> {
  return loadAdminLayoutContext()
}
