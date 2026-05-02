"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin } from "@/actions/auth"
import {
  adminCreatePdfMaterial,
  adminDeletePdfMaterial,
  adminUpdatePdfMaterial,
  getPublishedPdfsForAdmin,
} from "@/lib/db/queries/pdfs"
import type { ActionResult } from "@/types/api"
import type { PDFMaterial } from "@/types"

export async function adminListPdfs(): Promise<ActionResult<PDFMaterial[]>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }
    const data = await getPublishedPdfsForAdmin()
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminCreatePdf(
  input: Parameters<typeof adminCreatePdfMaterial>[0]
): Promise<ActionResult<PDFMaterial>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }
    const data = await adminCreatePdfMaterial(input)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminUpdatePdf(
  id: string,
  input: Parameters<typeof adminUpdatePdfMaterial>[1]
): Promise<ActionResult<PDFMaterial | null>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }
    const data = await adminUpdatePdfMaterial(id, input)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function adminRemovePdf(pdfId: string): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }
    await adminDeletePdfMaterial(pdfId)
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
