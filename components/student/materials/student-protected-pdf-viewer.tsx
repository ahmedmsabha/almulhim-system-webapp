"use client"

import { useEffect, useRef, useState } from "react"
import { PdfCanvasViewer } from "@/components/shared/media/pdf-canvas-viewer"
import { Loader2 } from "lucide-react"
import { PDF_OFFLINE_CHANGED, getPdfOffline } from "@/lib/client/pdf-offline-db"

const viewerFetch = (materialId: string) =>
  fetch(`/api/student/pdf/${materialId}`, {
    credentials: "include",
    cache: "no-store",
  })

type Props = { materialId: string; title: string }

/**
 * يعرض PDF بعد جلب bytes عبر الطلب المحمّي (مع cache: no-store)، ويبتعد عن مخبأ PWA الذي كان يفسد iframe.
 * عند وجود نسخة IndexedDB بعد «تحميل» المنصّة تُستخدم مباشرة.
 */
export function StudentProtectedPdfViewer({ materialId, title }: Props) {
  /** null = جاري التحميل الأولي؛ نص فارغ لا يستخدم */
  const [iframeSrc, setIframeSrc] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const revokeBlob = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }

  useEffect(() => {
    let alive = true

    async function loadFromOfflineOrNetwork() {
      revokeBlob()
      if (!alive) return
      setIframeSrc(null)
      setLoadError(null)

      const offline = await getPdfOffline(materialId)
      if (!alive) return

      if (offline && offline.size > 0) {
        const u = URL.createObjectURL(offline)
        blobUrlRef.current = u
        setIframeSrc(u)
        setLoadError(null)
        return
      }

      try {
        const res = await viewerFetch(materialId)
        if (!alive) return

        if (!res.ok) {
          const txt = await res.text().catch(() => "")
          let hint = ""
          try {
            const j = JSON.parse(txt) as { error?: string }
            hint = j.error ? `: ${j.error}` : ""
          } catch {
            hint = txt ? `: ${txt.slice(0, 120)}` : ""
          }

          let msg =
            res.status === 401 ? "سجّل الدخول أولاً ثم حدِّث الصفحة."
          : res.status === 403 ? "الاشتراك غير فعّال أو انتهى."
          : res.status === 502 ? "تعذّر جلب الملف من الحاوية؛ تحقّق من وجود الرابط ومفتاح الخادم للتخزين."
          : res.status === 500 ? "تعذّر استخراج مسار ملف التخزين؛ تحقّق من حقل file_url في المنصّة."
          : "تعذّر جلب الملف للعرض."
          msg += hint
          setLoadError(msg)
          return
        }

        const ctype = res.headers.get("content-type") ?? ""

        const ab = await res.arrayBuffer()
        if (!alive) return

        const snippet = ab.byteLength <= 4096 ? ab : ab.slice(0, 4096)
        const u8 = new Uint8Array(snippet)
        const isPdfMagic =
          u8.length >= 5 &&
          u8[0] === 0x25 &&
          u8[1] === 0x50 &&
          u8[2] === 0x44 &&
          u8[3] === 0x46

        if (!isPdfMagic) {
          const headTxt = new TextDecoder().decode(snippet.slice(0, Math.min(snippet.byteLength, 380)))
          const looksHtml =
            headTxt.includes("<!DOC") ||
            headTxt.includes("<html") ||
            headTxt.includes("{\"error\"") ||
            /\/json/i.test(ctype)
          const looksLikeJson = headTxt.trimStart().startsWith("{")
          if (looksHtml || looksLikeJson) {
            setLoadError(
              "تم استلام خطأ بدلًا من ملف PDF (غالبًا من الخادم أو من مخزّن PWA قديم). حدّث الصفحة، وإذا استمر الأمر احذف بيانات هذا الموقع والـ Service Worker ثم حاول مجدداً."
            )
            return
          }
          setLoadError("الاستجابة لا تبدو كملف PDF صالحاً.")
          return
        }

        const blob = new Blob([ab], { type: "application/pdf" })
        const u = URL.createObjectURL(blob)
        blobUrlRef.current = u
        setIframeSrc(u)
      } catch {
        if (!alive) return
        setLoadError("تعذّر الاتصال بالخادم لعرض الملف.")
      }
    }

    void loadFromOfflineOrNetwork()

    const handler = (ev: Event) => {
      const d = (ev as CustomEvent<{ materialId?: string }>).detail
      if (d?.materialId !== materialId) return
      void loadFromOfflineOrNetwork()
    }
    window.addEventListener(PDF_OFFLINE_CHANGED, handler)
    return () => {
      alive = false
      window.removeEventListener(PDF_OFFLINE_CHANGED, handler)
      revokeBlob()
    }
  }, [materialId])

  if (loadError) {
    return (
      <div className="flex min-h-[48vh] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-muted/40 p-8 text-center text-sm">
        <p className="max-w-lg text-muted-foreground">{loadError}</p>
        <p className="text-xs text-muted-foreground">
          إن استمر ذلك بعد التحديث: من إعداد المتصفّح احذف بيانات الموقع لمضمَّن التطبيق (service worker)، ثم جرّب مرة ثانية بعد تسجيل الدخول.
        </p>
      </div>
    )
  }

  if (iframeSrc === null) {
    return (
      <div className="flex min-h-[48vh] flex-col items-center justify-center gap-2 rounded-xl border bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">جاري تحميل الملف…</p>
      </div>
    )
  }

  return <PdfCanvasViewer src={iframeSrc} title={title} frameClassName="min-h-[65vh]" />
}
