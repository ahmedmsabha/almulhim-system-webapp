import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { env } from "@/lib/env"

const emailOtpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
])

function redirect(request: NextRequest, pathWithSearch: string) {
  return NextResponse.redirect(new URL(pathWithSearch, request.nextUrl.origin))
}

function supabaseForRedirect(request: NextRequest, response: NextResponse) {
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })
}

/** معالجة رابط تأكيد البريد من قالب البريد (بديلًا عن إدخال الرمز على /verify). */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl

    const code = url.searchParams.get("code")
    if (code) {
      const response = redirect(request, "/student")
      const supabase = supabaseForRedirect(request, response)
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        const q = new URLSearchParams({ auth_error: error.message }).toString()
        return redirect(request, `/login?${q}`)
      }
      return response
    }

    const token_hash = url.searchParams.get("token_hash")
    const typeRaw = url.searchParams.get("type")

    if (!token_hash || !typeRaw) {
      return redirect(request, "/verify")
    }

    const typeParsed = emailOtpTypeSchema.safeParse(typeRaw)
    if (!typeParsed.success) {
      return redirect(request, "/login?auth_error=invalid_link")
    }

    const response = redirect(request, "/student")
    const supabase = supabaseForRedirect(request, response)
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: typeParsed.data,
    })

    if (error) {
      const q = new URLSearchParams({ auth_error: error.message }).toString()
      return redirect(request, `/login?${q}`)
    }

    return response
  } catch {
    return redirect(request, "/login")
  }
}
