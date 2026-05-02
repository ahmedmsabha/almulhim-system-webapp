import { eq } from "drizzle-orm"

import { adminDb, withUserDb } from "@/lib/db/client"
import { profiles } from "@/lib/db/schema"
import { subscriptionIsActive } from "@/lib/db/subscription"

import type { Profile } from "../types"

import { createClient } from "./server"

// Get current authenticated user
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

function mapDbProfile(row: typeof profiles.$inferSelect): Profile {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    grade: row.grade,
    avatar_url: row.avatar_url,
    role: row.role as Profile["role"],
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

// Get current user's profile
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return null
  }

  const rows = await withUserDb(session.access_token, async (tx) =>
    tx.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  )

  const row = rows[0]
  return row ? mapDbProfile(row) : null
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile()
  return profile?.role === "admin"
}

// Check if user has active subscription
export async function hasActiveSubscription(): Promise<boolean> {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  return subscriptionIsActive(adminDb, user.id)
}

// Sign out
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

// TODO: Implement Row Level Security (RLS) policies:
// - profiles: Users can read their own profile, admins can read all
// - video_lessons: Authenticated users with active subscription can read, admins can CRUD
// - pdf_materials: Same as video_lessons
// - announcements: All authenticated users can read, admins can CRUD
// - messages: Users can read/write their own conversations, admins can read/write all
// - subscriptions: Users can read their own, admins can CRUD
// - watch_progress: Users can read/write their own progress
