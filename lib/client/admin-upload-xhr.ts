"use client"

function browserAnonKey(): string {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!k) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  return k
}

/**
 * رفع الملف الموقَّع يجب أن يمر بدور **anon** مع التوكن في الرابط.
 * استخدام JWT الطالب/المعلِّم مع الرابط الموقَّع يفعِّل RLS كـ authenticated غالباً بدون INSERT فيصرّح الطلب بخطأ RLS.
 */
function signedUploadHeaders(): Record<string, string> {
  const anon = browserAnonKey()
  return {
    Authorization: `Bearer ${anon}`,
    apikey: anon,
  }
}

/** لا تُضفِ Content-Type يدوياً عند إرسال FormData — المتصفح يضيف الحدود. */
export function xhrPostFormData(
  url: string,
  headers: Record<string, string>,
  body: FormData,
  onProgress?: (percentApprox: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v)
    }
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable || !onProgress) return
      onProgress(Math.min(99, Math.round((ev.loaded / Math.max(ev.total, 1)) * 100)))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
      } else {
        const hint = xhr.responseText?.slice(0, 280) || xhr.statusText
        reject(new Error(`فشل الرفع (${xhr.status}): ${hint}`))
      }
    }
    xhr.onerror = () => reject(new Error("خطأ شبكة أثناء الرفع"))
    xhr.send(body)
  })
}

/** مطابق لـ Supabase `uploadToSignedUrl`: PUT مع FormData (وليس POST). */
export function xhrPutFormData(
  url: string,
  headers: Record<string, string>,
  body: FormData,
  onProgress?: (percentApprox: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v)
    }
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable || !onProgress) return
      onProgress(Math.min(99, Math.round((ev.loaded / Math.max(ev.total, 1)) * 100)))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
      } else {
        const hint = xhr.responseText?.slice(0, 280) || xhr.statusText
        reject(new Error(`فشل الرفع (${xhr.status}): ${hint}`))
      }
    }
    xhr.onerror = () => reject(new Error("خطأ شبكة أثناء الرفع"))
    xhr.send(body)
  })
}

export function xhrPutBlob(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress?.(ev.loaded, Math.max(ev.total, 1))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        const hint = xhr.responseText?.slice(0, 200) || xhr.statusText
        reject(new Error(`فشل PUT (${xhr.status}): ${hint}`))
      }
    }
    xhr.onerror = () => reject(new Error("خطأ شبكة أثناء رفع الجزء"))
    xhr.send(body)
  })
}

/**
 * مطابق لـ Supabase `uploadToSignedUrl`: PUT multipart إلى `/object/upload/sign/{bucket}/{path}?token=`.
 */
export async function uploadMaterialsPdfViaSignedToken(opts: {
  bucket: string
  /** مسار داخل الحاوية، مثل pdfs/uuid.pdf */
  storagePath: string
  token: string
  file: File
  upsert?: boolean
  cacheControl?: string
  onProgress?: (percent: number) => void
}): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL غير مضبوط")

  const cleanPath = opts.storagePath.replace(/^\/|\/$/g, "").replace(/\/+/g, "/")
  const encodedSegments = [opts.bucket, ...cleanPath.split("/").filter(Boolean)].map((s) =>
    encodeURIComponent(s)
  )
  const uploadUrl = `${base}/storage/v1/object/upload/sign/${encodedSegments.join("/")}?token=${encodeURIComponent(opts.token)}`

  const auth = signedUploadHeaders()
  const fd = new FormData()
  fd.append("cacheControl", opts.cacheControl ?? "3600")
  fd.append("", opts.file)

  await xhrPutFormData(
    uploadUrl,
    {
      ...auth,
      "x-upsert": String(opts.upsert ?? true),
    },
    fd,
    opts.onProgress
  )
}
