import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { env } from "@/lib/env"

/** Next.js 16+: يُستبدل `middleware` بـ `proxy` — نفس المسؤولية: تحديث جلسة Supabase عبر الكوكيز. */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  await supabase.auth.getUser()

  return supabaseResponse
}

/**
 * تجديد الجلسة فقط للمسارات التي تحتاج مزامنة كوكي (صفحات بعد الدخول + API المحمية).
 * استثناء الصفحات العامة يقلّل وقت أول تحميل على اتصالات ضعيفة.
 */
export const config = {
  matcher: [
    "/student/:path*",
    "/admin/:path*",
    "/api/student/:path*",
    "/auth/confirm/:path*",
    "/offline/:path*",
  ],
}
