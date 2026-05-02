import "server-only"

import { PDFParse } from "pdf-parse"

async function countWithPdfJsDirect(buffer: Buffer): Promise<number | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const data = new Uint8Array(buffer)
    const loadingTask = pdfjs.getDocument({ data, verbosity: 0 })
    const doc = await loadingTask.promise
    try {
      const n = doc.numPages
      return typeof n === "number" && n > 0 ? n : null
    } finally {
      await doc.destroy()
    }
  } catch (e) {
    console.error("[pdf-page-count] pdfjs direct count failed", e)
    return null
  }
}

export async function countPdfPagesFromBuffer(buffer: Buffer): Promise<number> {
  const parser = new PDFParse({ data: buffer })
  try {
    const info = await parser.getInfo()
    const n = info.total
    if (typeof n === "number" && n > 0) {
      return n
    }
  } catch (e) {
    console.error("[pdf-page-count] PDFParse.getInfo failed, trying pdfjs", e)
  } finally {
    try {
      await parser.destroy()
    } catch {
      /* ignore */
    }
  }

  const direct = await countWithPdfJsDirect(buffer)
  if (direct != null) {
    return direct
  }

  return 1
}
