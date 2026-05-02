import "server-only"

import { eq } from "drizzle-orm"

import { adminDb } from "@/lib/db/client"
import { profiles } from "@/lib/db/schema"
import { PROGRAM } from "@/lib/config"
import type { User } from "@supabase/supabase-js"

/** إنشاء صف profiles إن لم يوجد (مثلاً قبل وجود trigger على auth.users). */
export async function ensureProfileRow(user: User): Promise<void> {
  const existing = await adminDb.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  if (existing[0]) return

  const meta = user.user_metadata as Record<string, string | undefined> | undefined
  const email = user.email ?? ""
  const fullName =
    typeof meta?.full_name === "string" && meta.full_name.trim() ?
      meta.full_name.trim()
    : (email.split("@")[0] || "مستخدم")

  const roleFromMeta = meta?.role
  const role =
    roleFromMeta === "admin" || roleFromMeta === "student" ? roleFromMeta : "student"

  await adminDb.insert(profiles).values({
    id: user.id,
    email,
    full_name: fullName,
    phone: typeof meta?.phone === "string" ? meta.phone : "",
    grade: typeof meta?.grade === "string" ? meta.grade : PROGRAM.defaultGradeCode,
    role,
  })
}
