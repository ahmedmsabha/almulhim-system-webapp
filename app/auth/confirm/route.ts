import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const emailOtpTypeSchema = z.enum([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
])

/** معالجة رابط تأكيد البريد من قالب البريد (بديلًا عن إدخال الرمز على /verify). */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const token_hash = url.searchParams.get("token_hash")
    const typeRaw = url.searchParams.get("type")

    const base = `${url.origin}`

    if (!token_hash || !typeRaw) {
      return NextResponse.redirect(`${base}/verify`)
    }

    const typeParsed = emailOtpTypeSchema.safeParse(typeRaw)
    if (!typeParsed.success) {
      return NextResponse.redirect(`${base}/login?auth_error=invalid_link`)
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: typeParsed.data,
    })

    if (error) {
      const q = new URLSearchParams({ auth_error: error.message }).toString()
      return NextResponse.redirect(`${base}/login?${q}`)
    }

    return NextResponse.redirect(`${base}/student`)
  } catch {
    const fallback = `${request.nextUrl.origin}/login`
    return NextResponse.redirect(fallback)
  }
}
