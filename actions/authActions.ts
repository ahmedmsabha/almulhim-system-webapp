"use server"

import { redirect } from "next/navigation"

import { getPublicSiteUrl } from "@/lib/config"
import {
  createClient,
  createClientWithSessionCookieMaxAge,
  SESSION_COOKIE_MAX_AGE_YEAR_SECONDS,
} from "@/lib/supabase/server"
import { LoginSchema, RegisterSchema, VerifyOtpSchema } from "@/lib/validators/register"

const SESSION_COOKIE_MAX_AGE_DAY_SECONDS = 60 * 60 * 24

export type SimpleAuthActionResult =
  | { success: true }
  | { success: false; error: string }

export async function signInWithPasswordAction(
  input: unknown,
): Promise<SimpleAuthActionResult> {
  const parsed = LoginSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: "تحقق من البريد وكلمة المرور.",
    }
  }

  const { email, password, rememberMe } = parsed.data
  const cookieMaxAgeSeconds = rememberMe ?
      SESSION_COOKIE_MAX_AGE_YEAR_SECONDS
    : SESSION_COOKIE_MAX_AGE_DAY_SECONDS

  try {
    const supabase = await createClientWithSessionCookieMaxAge(cookieMaxAgeSeconds)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع."
    return { success: false, error: msg }
  }
}

export async function signUpAction(input: unknown): Promise<SimpleAuthActionResult> {
  try {
    const parsed = RegisterSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: "تحقق من الاسم والبريد وكلمة المرور (8 أحرف على الأقل)." }
    }

    const { full_name, email, password } = parsed.data
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role: "student" },
        emailRedirectTo: `${getPublicSiteUrl()}/auth/confirm`,
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع."
    return { success: false, error: msg }
  }
}

export async function verifyOtpAction(input: unknown): Promise<SimpleAuthActionResult> {
  const parsed = VerifyOtpSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "أدخل بريداً صالحاً ورمزًا مكوّناً من 6 أرقام." }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: "signup",
    })

    if (error) {
      return { success: false, error: error.message }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع."
    return { success: false, error: msg }
  }

  redirect("/student")
}
