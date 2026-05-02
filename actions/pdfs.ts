"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { getSessionAccessToken, requireStudent } from "@/actions/auth"
import { getPdfWithAccess, getSubscriberPdfs } from "@/lib/db/queries/pdfs"
import type { ActionResult } from "@/types/api"
import type { PDFMaterial } from "@/types"

export async function getPdfs(): Promise<ActionResult<PDFMaterial[]>> {
  try {
    const gate = await requireStudent()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const token = await getSessionAccessToken()
    if (!token) {
      return actionFailure("انتهت الجلسة", "UNAUTHORIZED")
    }

    const data = await getSubscriberPdfs(token)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function getPdfById(
  pdfId: string
): Promise<ActionResult<PDFMaterial>> {
  try {
    const token = await getSessionAccessToken()
    if (!token) {
      return actionFailure("يجب تسجيل الدخول", "UNAUTHORIZED")
    }

    const data = await getPdfWithAccess(pdfId, token)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
