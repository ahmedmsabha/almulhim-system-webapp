"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireStudentSession } from "@/actions/auth"
import { getPdfWithAccess, getSubscriberPdfs } from "@/lib/db/queries/pdfs"
import type { ActionResult } from "@/types/api"
import type { PDFMaterial } from "@/types"

export async function getPdfs(): Promise<ActionResult<PDFMaterial[]>> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const data = await getSubscriberPdfs(gate.data.accessToken)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function getPdfById(
  pdfId: string
): Promise<ActionResult<PDFMaterial>> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const data = await getPdfWithAccess(pdfId, gate.data.accessToken)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
