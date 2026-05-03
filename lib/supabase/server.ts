import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

import { env } from '@/lib/env'

async function createServerSupabaseClient() {
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
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy.ts refreshing
            // user sessions (Next.js 16+; formerly middleware).
          }
        },
      },
    }
  )
}

/** One Supabase client per request; avoids duplicate cookie reads and client setup in nested layouts/pages. */
export const createClient = cache(createServerSupabaseClient)
