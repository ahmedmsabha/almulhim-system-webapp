import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

import { env } from '@/lib/env'

/** Default session cookie lifetime (e.g. "stay signed in"). */
export const SESSION_COOKIE_MAX_AGE_YEAR_SECONDS = 60 * 60 * 24 * 365

async function createServerSupabaseClient(
  sessionCookieMaxAgeSeconds: number = SESSION_COOKIE_MAX_AGE_YEAR_SECONDS,
) {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: sessionCookieMaxAgeSeconds,
              }),
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy.ts refreshing
            // user sessions (Next.js 16+; formerly middleware).
          }
        },
      },
    },
  )
}

/** One Supabase client per request; avoids duplicate cookie reads and client setup in nested layouts/pages. */
export const createClient = cache(createServerSupabaseClient)

/** Login / auth flows that need a shorter cookie lifetime than the default year. */
export function createClientWithSessionCookieMaxAge(maxAgeSeconds: number) {
  return createServerSupabaseClient(maxAgeSeconds)
}
