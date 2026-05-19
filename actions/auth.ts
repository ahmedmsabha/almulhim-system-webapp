"use server"

import { eq } from "drizzle-orm"
import { withUserDb } from "@/lib/db/client"
import { profiles } from "@/lib/db/schema"
import { createClient } from "@/lib/supabase/server"
import {
  profileFromDbRow,
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

async function resolveSessionRoleGate(
  expectedRole: "student" | "admin"
): Promise<ActionResult<{ profile: Profile; accessToken: string }>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return actionFailure("غير مصرح", "UNAUTHORIZED")
    }
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return actionFailure("غير مصرح", "UNAUTHORIZED")
    }

    const rows = await withUserDb(session.access_token, async (tx) =>
      tx.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
    )
    const row = rows[0]
    if (!row) {
      return actionFailure("تعذر تحميل الملف الشخصي", "UNKNOWN")
    }
    const profile = profileFromDbRow(row)

    if (profile.role !== expectedRole) {
      return expectedRole === "student" ?
          actionFailure("هذا القسم للطلاب فقط", "FORBIDDEN")
        : actionFailure("يتطلب صلاحية المعلم", "FORBIDDEN")
    }

    return actionSuccess({ profile, accessToken: session.access_token })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function requireStudentSession(): Promise<
  ActionResult<{ profile: Profile; accessToken: string }>
> {
  return resolveSessionRoleGate("student")
}

export async function requireAdminSession(): Promise<
  ActionResult<{ profile: Profile; accessToken: string }>
> {
  return resolveSessionRoleGate("admin")
}

/** طالب أو مشرف؛ جلسة واحدة بدل محاولتي requireStudent/requireAdmin المتتاليتين. */
export async function requireStudentOrAdminSession(): Promise<
  ActionResult<{ profile: Profile; accessToken: string }>
> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return actionFailure("غير مصرح", "UNAUTHORIZED")
    }
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return actionFailure("غير مصرح", "UNAUTHORIZED")
    }

    const rows = await withUserDb(session.access_token, async (tx) =>
      tx.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
    )
    const row = rows[0]
    if (!row) {
      return actionFailure("تعذر تحميل الملف الشخصي", "UNKNOWN")
    }
    const profile = profileFromDbRow(row)

    if (profile.role !== "student" && profile.role !== "admin") {
      return actionFailure("يجب تسجيل الدخول", "UNAUTHORIZED")
    }

    return actionSuccess({ profile, accessToken: session.access_token })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

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
    const r = await resolveSessionRoleGate("student")
    return r.success ? actionSuccess(r.data.profile) : r
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function requireAdmin(): Promise<ActionResult<Profile>> {
  try {
    const r = await resolveSessionRoleGate("admin")
    return r.success ? actionSuccess(r.data.profile) : r
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function getSessionAccessToken(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: "local" })
  } catch {
    /* Cookie/session clear best-effort; client forces /public/login reload */
  }
}

/** بعد تسجيل الدخول من العميل — يضمن صف profiles ويعيد مسار التوجيه. */
export async function resolvePostLoginDestination(): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return actionFailure("غير مصرح", "UNAUTHORIZED")
    }
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return actionFailure("غير مصرح", "UNAUTHORIZED")
    }

    await ensureProfileRow(user)

    const rows = await withUserDb(session.access_token, async (tx) =>
      tx.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
    )
    const row = rows[0]
    if (!row) {
      return actionFailure("تعذر إنشاء الملف الشخصي", "UNKNOWN")
    }

    return actionSuccess(row.role === "admin" ? "/admin" : "/student")
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
