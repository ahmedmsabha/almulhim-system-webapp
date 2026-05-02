"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import {
  getCurrentProfile,
  getCurrentUser as getSupabaseAuthUser,
} from "@/lib/supabase/auth"
import { ensureProfileRow } from "@/lib/supabase/ensure-profile"
import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import type { ActionResult } from "@/types/api"
import type { Profile } from "@/types"

export async function getCurrentUser(): Promise<
  ActionResult<{ id: string; email: string | undefined } | null>
> {
  try {
    const user = await getSupabaseAuthUser()
    if (!user) {
      return actionSuccess(null)
    }
    return actionSuccess({ id: user.id, email: user.email })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function requireStudent(): Promise<ActionResult<Profile>> {
  try {
    const profile = await getCurrentProfile()
    if (!profile) {
      return actionFailure("يجب تسجيل الدخول", "UNAUTHORIZED")
    }
    if (profile.role !== "student") {
      return actionFailure("هذا القسم للطلاب فقط", "FORBIDDEN")
    }
    return actionSuccess(profile)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function requireAdmin(): Promise<ActionResult<Profile>> {
  try {
    const profile = await getCurrentProfile()
    if (!profile) {
      return actionFailure("يجب تسجيل الدخول", "UNAUTHORIZED")
    }
    if (profile.role !== "admin") {
      return actionFailure("يتطلب صلاحية المعلم", "FORBIDDEN")
    }
    return actionSuccess(profile)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function getSessionAccessToken(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/** بعد تسجيل الدخول من العميل — يضمن صف profiles ويعيد مسار التوجيه. */
export async function resolvePostLoginDestination(): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return actionFailure("يجب تسجيل الدخول", "UNAUTHORIZED")
    }

    await ensureProfileRow(user)
    const profile = await getCurrentProfile()
    if (!profile) {
      return actionFailure("تعذر إنشاء الملف الشخصي", "UNKNOWN")
    }

    return actionSuccess(profile.role === "admin" ? "/admin" : "/student")
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
