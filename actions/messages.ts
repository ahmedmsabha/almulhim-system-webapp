"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { getSessionAccessToken, requireStudent } from "@/actions/auth"
import {
  getMessages as fetchMessages,
  markMessagesAsRead as markMessagesAsReadDb,
  sendMessage as sendMessageDb,
} from "@/lib/db/queries/messages"
import type { ActionResult } from "@/types/api"
import type { Message } from "@/types"

export async function getConversation(
  conversationId: string
): Promise<ActionResult<Message[]>> {
  try {
    const gate = await requireStudent()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const token = await getSessionAccessToken()
    if (!token) {
      return actionFailure("انتهت الجلسة", "UNAUTHORIZED")
    }

    const data = await fetchMessages(conversationId, token)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function sendMessage(input: {
  conversationId: string
  senderId: string
  content: string
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const token = await getSessionAccessToken()
    if (!token) {
      return actionFailure("يجب تسجيل الدخول", "UNAUTHORIZED")
    }

    await sendMessageDb(input.conversationId, input.senderId, input.content, token)
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function markAsRead(
  conversationId: string
): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireStudent()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const token = await getSessionAccessToken()
    if (!token) {
      return actionFailure("انتهت الجلسة", "UNAUTHORIZED")
    }

    await markMessagesAsReadDb(conversationId, token)
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
