import "server-only"

import { PDFDocument } from "pdf-lib"

/**
 * عدّ صفحات PDF على الخادم بدون pdfjs — حزمة pdf-parse الحالية تسحب pdfjs-dist الذي يحتاج DOMMatrix (متصفح فقط).
 * pdf-lib يعمل في Node/Vercel.
 */
export async function countPdfPagesFromBuffer(buffer: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(buffer)
    const n = doc.getPageCount()
    if (typeof n === "number" && n > 0) {
      return n
    }
  } catch (e) {
    console.error("[pdf-page-count] pdf-lib load failed", e)
  }
  return 1
}
