"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin, requireAdminSession, requireStudentSession } from "@/actions/auth"
import {
  createAnnouncement as insertAnnouncement,
  deleteAnnouncement as deleteAnnouncementRow,
  getAnnouncements as fetchAnnouncementsForUser,
  updateAnnouncement as updateAnnouncementRow,
} from "@/lib/db/queries/announcements"
import type { ActionResult } from "@/types/api"
import type { Announcement } from "@/types"

export async function getAnnouncements(): Promise<ActionResult<Announcement[]>> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const data = await fetchAnnouncementsForUser(gate.data.accessToken, { is_published: true })
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function createAnnouncement(input: {
  title: string
  body: string
  image_url?: string | null
  is_pinned?: boolean
  is_published?: boolean
}): Promise<ActionResult<Announcement | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const created = await insertAnnouncement({
      title: input.title,
      body: input.body,
      image_url: input.image_url,
      is_pinned: input.is_pinned,
      is_published: input.is_published,
    })
    return actionSuccess(created)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function getAnnouncementsAdmin(): Promise<ActionResult<Announcement[]>> {
  try {
    const gate = await requireAdminSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const data = await fetchAnnouncementsForUser(gate.data.accessToken)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function updateAnnouncementAction(
  id: string,
  patch: {
    title?: string
    body?: string
    image_url?: string | null
    is_pinned?: boolean
    is_published?: boolean
  }
): Promise<ActionResult<Announcement | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const updated = await updateAnnouncementRow(id, patch)
    return actionSuccess(updated)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function toggleAnnouncementPinAction(
  id: string,
  isPinned: boolean
): Promise<ActionResult<Announcement | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const updated = await updateAnnouncementRow(id, { is_pinned: isPinned })
    return actionSuccess(updated)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function deleteAnnouncementAction(
  id: string
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const ok = await deleteAnnouncementRow(id)
    return actionSuccess({ deleted: ok })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
