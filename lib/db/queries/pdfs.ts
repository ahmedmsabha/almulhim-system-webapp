import "server-only"
import { and, desc, eq } from "drizzle-orm"
import { jwtDecode, type JwtPayload } from "jwt-decode"

import { adminDb, withUserDb } from "@/lib/db/client"
import { pdfMaterials } from "@/lib/db/schema"
import { subscriptionIsActive } from "@/lib/db/subscription"
import {
  ResourceNotFoundError,
  SubscriptionExpiredError,
  UnauthorizedError,
} from "@/lib/db/errors"
import type { PDFMaterial } from "@/types"

export function rowToPdf(row: typeof pdfMaterials.$inferSelect): PDFMaterial {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    category: row.category as PDFMaterial["category"],
    file_url: row.file_url ?? null,
    file_size: row.file_size,
    page_count: row.page_count,
    is_published: row.is_published,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function getPublishedPdfs(): Promise<PDFMaterial[]> {
  const rows = await adminDb
    .select()
    .from(pdfMaterials)
    .where(eq(pdfMaterials.is_published, true))
    .orderBy(desc(pdfMaterials.created_at))

  return rows.map(rowToPdf)
}

export async function getPublishedPdfsForAdmin(opts?: {
  is_published?: boolean
  category?: string
}): Promise<PDFMaterial[]> {
  const preds = []
  if (opts?.is_published !== undefined)
    preds.push(eq(pdfMaterials.is_published, opts.is_published))
  if (opts?.category) preds.push(eq(pdfMaterials.category, opts.category))

  const rows =
    preds.length > 0 ?
      await adminDb
        .select()
        .from(pdfMaterials)
        .where(and(...preds))
        .orderBy(desc(pdfMaterials.created_at))
      : await adminDb.select().from(pdfMaterials).orderBy(desc(pdfMaterials.created_at))

  return rows.map(rowToPdf)
}

export async function getPdfMaterialById(id: string): Promise<PDFMaterial | null> {
  const rows = await adminDb.select().from(pdfMaterials).where(eq(pdfMaterials.id, id)).limit(1)

  const row = rows[0]
  return row ? rowToPdf(row) : null
}

/** Published PDF with active-subscription enforcement (student session). */
export async function getPdfWithAccess(id: string, accessToken: string): Promise<PDFMaterial> {
  const subClaim = jwtDecode<JwtPayload>(accessToken).sub
  if (!subClaim) throw new UnauthorizedError()

  return withUserDb(accessToken, async (tx) => {
    const rows = await tx
      .select()
      .from(pdfMaterials)
      .where(and(eq(pdfMaterials.id, id), eq(pdfMaterials.is_published, true)))
      .limit(1)

    const row = rows[0]
    if (!row) throw new ResourceNotFoundError("PDF not found")

    const ok = await subscriptionIsActive(tx, subClaim)
    if (!ok) throw new SubscriptionExpiredError()

    return rowToPdf(row)
  })
}

/** All published materials when the JWT subject has active subscription (RLS-aligned). */
export async function getSubscriberPdfs(accessToken: string): Promise<PDFMaterial[]> {
  const subClaim = jwtDecode<JwtPayload>(accessToken).sub
  if (!subClaim) throw new UnauthorizedError()

  return withUserDb(accessToken, async (tx) => {
    const ok = await subscriptionIsActive(tx, subClaim)
    if (!ok) return []

    const rows = await tx
      .select()
      .from(pdfMaterials)
      .where(eq(pdfMaterials.is_published, true))
      .orderBy(desc(pdfMaterials.created_at))

    return rows.map(rowToPdf)
  })
}

export async function adminCreatePdfMaterial(input: {
  title: string
  description?: string | null
  category: PDFMaterial["category"]
  file_url?: string | null
  file_size: number
  page_count: number
  is_published?: boolean
}): Promise<PDFMaterial> {
  const [row] = await adminDb
    .insert(pdfMaterials)
    .values({
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      file_url: input.file_url ?? null,
      file_size: input.file_size,
      page_count: input.page_count,
      is_published: input.is_published ?? true,
    })
    .returning()

  if (!row) throw new Error("insert pdf failed")
  return rowToPdf(row)
}

export async function adminUpdatePdfMaterial(
  id: string,
  input: Partial<{
    title: string
    description: string | null
    category: PDFMaterial["category"]
    file_url: string | null
    file_size: number
    page_count: number
    is_published: boolean
  }>
): Promise<PDFMaterial | null> {
  const updatePayload: Record<string, unknown> = { updated_at: new Date() }
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) updatePayload[k] = v
  }
  const [row] = await adminDb
    .update(pdfMaterials)
    .set(updatePayload as Partial<typeof pdfMaterials.$inferInsert>)
    .where(eq(pdfMaterials.id, id))
    .returning()

  return row ? rowToPdf(row) : null
}

export async function adminDeletePdfMaterial(id: string): Promise<void> {
  await adminDb.delete(pdfMaterials).where(eq(pdfMaterials.id, id))
}
