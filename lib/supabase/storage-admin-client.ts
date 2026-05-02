import "server-only"

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"
import { createClient as createServerClient } from "@/lib/supabase/server"

/**
 * Signed uploads should use the service role when possible so Storage RLS need not
 * grant INSERT broadly to every authenticated Supabase user (students included).
 */
export async function createSupabaseForSignedStorageOps() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (serviceKey) {
    return createSupabaseJsClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return createServerClient()
}
