import "server-only"

import { eq } from "drizzle-orm"

import { jwtDecode, type JwtPayload } from "jwt-decode"

import { adminDb } from "@/lib/db/client"
import { subscriptionIsActive } from "@/lib/db/subscription"
import { profiles } from "@/lib/db/schema"
import { SubscriptionExpiredError, UnauthorizedError } from "@/lib/db/errors"

export async function requireAdmin(accessToken: string): Promise<void> {
  const sub = jwtDecode<JwtPayload>(accessToken).sub
  if (!sub) {
    throw new UnauthorizedError()
  }

  const row = await adminDb
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, sub))
    .limit(1)

  if (row[0]?.role !== "admin") {
    throw new UnauthorizedError("Admin access required")
  }
}

export async function requireActiveSubscription(accessToken: string): Promise<void> {
  const sub = jwtDecode<JwtPayload>(accessToken).sub
  if (!sub) {
    throw new UnauthorizedError()
  }

  const ok = await subscriptionIsActive(adminDb, sub)
  if (!ok) {
    throw new SubscriptionExpiredError()
  }
}

export function getUserFromToken(accessToken: string): JwtPayload & {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
} {
  return jwtDecode<
    JwtPayload & {
      app_metadata?: Record<string, unknown>
      user_metadata?: Record<string, unknown>
    }
  >(accessToken)
}
