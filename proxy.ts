import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/env"

/**
 * Next.js 16+: `proxy.ts` يحلّ محل `middleware.ts` — تحديث كوكيز JWT + حماية المسارات.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublicAuthPage =
    pathname === "/" ||
    pathname.startsWith("/public/login") ||
    pathname.startsWith("/public/register") ||
    pathname.startsWith("/public/subscribe")

  const isProtectedPage = pathname.startsWith("/student") || pathname.startsWith("/admin")

  if (user && isPublicAuthPage) {
    const readRole = (meta: unknown): string | undefined => {
      if (typeof meta !== "object" || meta === null || !("role" in meta)) return undefined
      const v = (meta as { role?: unknown }).role
      return typeof v === "string" ? v : undefined
    }
    const resolvedRole = readRole(user.app_metadata) ?? readRole(user.user_metadata)

    const url = request.nextUrl.clone()
    url.pathname = resolvedRole === "admin" ? "/admin" : "/student"
    return NextResponse.redirect(url)
  }

  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/public/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|workbox-.*\\.js|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js\\.map)$).*)",
  ],
}
