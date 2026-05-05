import "server-only"

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { cache } from "react"

import { withUserDb } from "@/lib/db/client"
import { profiles } from "@/lib/db/schema"
import { getStudentProfileRowAndLatestSubscription } from "@/lib/db/queries/subscriptions-read"
import { profileFromDbRow } from "@/lib/supabase/auth"
import { ensureProfileRow } from "@/lib/supabase/ensure-profile"
import { createClient } from "@/lib/supabase/server"
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

export const requireStudentLayoutContext = cache(async (): Promise<StudentLayoutContext> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  await ensureProfileRow(user)

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) redirect("/login")

  let subscription: Subscription | null = null
  let profile: Profile | undefined
  try {
    const { profile: rawProfile, subscription: sub } =
      await getStudentProfileRowAndLatestSubscription(accessToken, user.id)
    if (!rawProfile || rawProfile.role !== "student") {
      redirect("/admin")
    }
    profile = profileFromDbRow(rawProfile)
    subscription = sub
  } catch {
    redirect("/login")
  }

  if (!profile) redirect("/login")

  const subscriptionStatus = studentSubscriptionUiStatus(subscription)
  return { profile, subscription, subscriptionStatus, accessToken }
})

/** صفحات الدروس والملفات وغيرها — يقتصر الوصول على اشتراك فعّال (يشمل «ينتهي قريباً»). */
export async function requireStudentContentAccess(): Promise<StudentLayoutContext> {
  const ctx = await requireStudentLayoutContext()
  if (ctx.subscriptionStatus !== "active") {
    redirect("/student")
  }
  return ctx
}

export const requireAdminLayoutContext = cache(async (): Promise<{ profile: Profile }> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  await ensureProfileRow(user)

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) redirect("/login")

  let profile: Profile | undefined
  try {
    const [rawProfile] = await withUserDb(accessToken, async (tx) =>
      tx.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
    )
    if (!rawProfile || rawProfile.role !== "admin") {
      redirect("/student")
    }
    profile = profileFromDbRow(rawProfile)
  } catch {
    redirect("/login")
  }

  if (!profile) redirect("/login")

  return { profile }
})
