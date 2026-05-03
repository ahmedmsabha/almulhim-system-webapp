import "server-only"

import { PDFParse } from "pdf-parse"

/**
 * عدّ الصفحات على الخادم فقط عبر pdf-parse (لا pdfjs-dist — يحتاج DOMMatrix وبيئة المتصفح).
 */
export async function countPdfPagesFromBuffer(buffer: Buffer): Promise<number> {
  const parser = new PDFParse({ data: buffer })
  try {
    const info = await parser.getInfo()
    const n = info.total
    if (typeof n === "number" && n > 0) {
      return n
    }
  } catch (e) {
    console.error("[pdf-page-count] PDFParse.getInfo failed", e)
  } finally {
    try {
      await parser.destroy()
    } catch {
      /* ignore */
    }
  }

  return 1
}
