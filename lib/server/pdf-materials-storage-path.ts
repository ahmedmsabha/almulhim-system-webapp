import "server-only"

const BUCKET = "materials"

/** أنماط عنوان Supabase المعتادة؛ البحث case-insensitive. */
const TAIL_AFTER_MATERIALS_MARKER = [
  "/storage/v1/object/public/materials/",
  "/object/public/materials/",
  "/storage/v1/object/authenticated/materials/",
  "/object/authenticated/materials/",
  "/storage/v1/object/sign/materials/",
  "/object/sign/materials/",
] as const

const UUID_FILE_RE = /^pdfs\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.pdf$/i

function indexInsensitive(hay: string, needle: string): number {
  return hay.toLowerCase().indexOf(needle.toLowerCase())
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function decodePathSegments(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map(safeDecodeURIComponent)
    .join("/")
}

/** يزيل بادئة أسم الحاوية إن وُجدت مرتين بنسخ URL خاطئ. */
function stripLeadingBucket(path: string, bucket: string): string {
  let p = path.replace(/^\/+/, "").trim()
  const prefix = `${bucket}/`
  while (p.length >= prefix.length && p.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase()) {
    p = p.slice(prefix.length).replace(/^\/+/, "").trim()
  }
  return p
}

function lowercaseUuidPdfPath(path: string): string | null {
  const m = path.match(UUID_FILE_RE)
  if (!m) return null
  return `pdfs/${m[1].toLowerCase()}.pdf`
}

function collectRawTails(fileUrl: string, bucket: string): string[] {
  const out: string[] = []
  const t = fileUrl.trim()
  if (!t) return out

  const beforeQuery = t.split(/[?#]/)[0] ?? t

  for (const marker of TAIL_AFTER_MATERIALS_MARKER) {
    const i = indexInsensitive(beforeQuery, marker)
    if (i === -1) continue
    const rawTail = beforeQuery.slice(i + marker.length)
    const head = rawTail.split(/[?#]/)[0] ?? rawTail
    const decoded = decodePathSegments(head)
    const cleaned = stripLeadingBucket(decoded, bucket)
    if (cleaned) out.push(cleaned)
  }

  if (!/^https?:\/\//i.test(beforeQuery)) {
    const rel = stripLeadingBucket(beforeQuery.replace(/^\/+/, ""), bucket)
    if (/^pdfs\/[^/]+\.pdf$/i.test(rel)) out.push(rel)
  }

  return out
}

/**
 * مسارات محتملة داخل حاوية materials (بدون اسم الحاوية) لاستدعاء Storage download.
 * يجربها الخادم بالترتيب حتى ينجح أحدهم.
 */
export function materialsPdfObjectPathsFromFileUrl(
  fileUrl: string,
  bucket: string = BUCKET
): string[] {
  const tails = collectRawTails(fileUrl, bucket)
  const seen = new Set<string>()
  const ordered: string[] = []

  const push = (raw: string | null | undefined) => {
    const p = (raw ?? "").replace(/^\/+/, "").trim()
    if (!p || seen.has(p)) return
    seen.add(p)
    ordered.push(p)
  }

  for (const base of tails) {
    const stripped = stripLeadingBucket(base, bucket)
    push(stripped)
    push(base)
    push(lowercaseUuidPdfPath(stripped))
    push(lowercaseUuidPdfPath(base))
  }

  return ordered
}

/** أول مسار محتمل (للتوافق مع كود قديم). */
export function materialsBucketPathFromFileUrl(fileUrl: string): string | null {
  const c = materialsPdfObjectPathsFromFileUrl(fileUrl)
  return c[0] ?? null
}
