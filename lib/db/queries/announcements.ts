import "server-only"
import { desc, eq } from "drizzle-orm"

import type { AnnouncementRow } from "@/lib/db/schema"
import { announcements } from "@/lib/db/schema"
import type { Announcement as AnnouncementType } from "@/types"

import { adminDb, withUserDb, type UserDb } from "@/lib/db/client"

function rowToAnnouncement(row: AnnouncementRow): AnnouncementType {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    image_url: row.image_url ?? null,
    is_pinned: row.is_pinned,
    is_published: row.is_published,
    published_at: row.published_at.toISOString(),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function getAnnouncements(
  accessToken: string,
  options?: { is_published?: boolean }
): Promise<AnnouncementType[]> {
  return withUserDb(accessToken, async (tx) =>
    fetchAnnouncementsForTx(tx, options).then((rows) => rows.map(rowToAnnouncement))
  )
}

async function fetchAnnouncementsForTx(
  tx: UserDb,
  options?: { is_published?: boolean }
): Promise<AnnouncementRow[]> {
  return options?.is_published !== undefined ?
      await tx
        .select()
        .from(announcements)
        .where(eq(announcements.is_published, options.is_published))
        .orderBy(desc(announcements.is_pinned), desc(announcements.published_at))
    : await tx
        .select()
        .from(announcements)
        .orderBy(desc(announcements.is_pinned), desc(announcements.published_at))
}

export async function createAnnouncement(data: {
  title: string
  body: string
  image_url?: string | null
  is_pinned?: boolean
  is_published?: boolean
  published_at?: Date
}) {
  const [created] = await adminDb
    .insert(announcements)
    .values({
      title: data.title,
      body: data.body,
      image_url: data.image_url ?? null,
      is_pinned: data.is_pinned ?? false,
      is_published: data.is_published ?? true,
      published_at: data.published_at ?? new Date(),
    })
    .returning()

  return created ? rowToAnnouncement(created) : null
}

export async function updateAnnouncement(
  id: string,
  data: Partial<{
    title: string
    body: string
    image_url: string | null
    is_pinned: boolean
    is_published: boolean
    published_at: Date
  }>
): Promise<AnnouncementType | null> {
  const [updated] = await adminDb
    .update(announcements)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(announcements.id, id))
    .returning()

  return updated ? rowToAnnouncement(updated) : null
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const deleted = await adminDb.delete(announcements).where(eq(announcements.id, id)).returning()
  return deleted.length > 0
}
