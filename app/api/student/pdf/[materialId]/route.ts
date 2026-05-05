import { NextResponse } from "next/server"

import {
  ResourceNotFoundError,
  SubscriptionExpiredError,
  UnauthorizedError,
} from "@/lib/db/errors"
import { getPdfWithAccess } from "@/lib/db/queries/pdfs"
import { env } from "@/lib/env"
import { materialsPdfObjectPathsFromFileUrl } from "@/lib/server/pdf-materials-storage-path"
import { createClient } from "@/lib/supabase/server"
import { createSupabaseForSignedStorageOps } from "@/lib/supabase/storage-admin-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** تدفق PDF لمشترك موثَّق؛ لا يعرض الرابط الثابت لـ Storage في الواجهة. */
export async function GET(_req: Request, ctx: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await ctx.params

  try {
    const supabaseAuth = await createClient()
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession()

    const token = session?.access_token
    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const pdf = await getPdfWithAccess(materialId, token)
    const fileUrl = (pdf.file_url ?? "").trim()
    if (!fileUrl) {
      return NextResponse.json({ error: "no_file_url" }, { status: 500 })
    }

    try {
      const fileHost = new URL(fileUrl).hostname
      const cfgHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname
      if (fileHost && cfgHost && fileHost !== cfgHost) {
        console.warn("[api/student/pdf] file_url host differs from NEXT_PUBLIC_SUPABASE_URL (CDN ok?)", {
          fileHost,
          cfgHost,
          materialId,
        })
      }
    } catch {
      /* رابط نسبي أو غير قياسي */
    }

    const paths = materialsPdfObjectPathsFromFileUrl(fileUrl)
    if (paths.length === 0) {
      console.warn("[api/student/pdf] could not derive storage paths", {
        materialId,
        snippet: fileUrl.slice(0, 160),
      })
      return NextResponse.json({ error: "storage_path_unknown" }, { status: 500 })
    }

    const supabaseStorage = await createSupabaseForSignedStorageOps()
    let lastMsg = ""
    let blob: Blob | null = null
    let usedPath = ""

    for (const storagePath of paths) {
      const { data, error } = await supabaseStorage.storage.from("materials").download(storagePath)
      lastMsg = error?.message ?? lastMsg
      if (!error && data && data.size > 0) {
        blob = data
        usedPath = storagePath
        break
      }
    }

    if (!blob) {
      console.warn("[api/student/pdf] Storage download failed for all paths", {
        materialId,
        tried: paths,
        lastMsg,
      })
      return NextResponse.json(
        {
          error:
            lastMsg ||
            "Object not found — تحقّق من لوحة Supabase → Storage → materials أن الملف ما زال موجوداً بنفس المسار (مثل pdfs/<uuid>.pdf)، أو أعد رفع الملف من إدارة المواد.",
        },
        { status: 502 }
      )
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[api/student/pdf] ok", { materialId, usedPath })
    }

    const buf = Buffer.from(await blob.arrayBuffer())

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=600",
        /** اسم ASCII بسيط حتى لا يفسِّر بعض العملاء سطر العنوان بحروف %-encode */
        "Content-Disposition": 'inline; filename="document.pdf"',
      },
    })
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    if (e instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    if (e instanceof SubscriptionExpiredError) {
      return NextResponse.json({ error: "subscription_required" }, { status: 403 })
    }
    console.error("[api/student/pdf]", e)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
