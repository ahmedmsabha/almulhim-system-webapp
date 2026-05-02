"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { Loader2, Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type PdfJsLite = Pick<typeof import("pdfjs-dist"), "getDocument" | "GlobalWorkerOptions" | "version">

let pdfjsPromise: Promise<PdfJsLite> | null = null

async function ensurePdfJs(): Promise<PdfJsLite> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`
      return pdfjs
    })
  }
  return pdfjsPromise
}

type Props = {
  /** `blob:` من منصّتك أو مسارًا محليًا؛ لا تمرِّر روابط públic لملفات الحسّاسة. */
  src: string
  title?: string
  className?: string
  frameClassName?: string
}

function PdfPageCanvas({
  doc,
  pageNumber,
  maxWidthPx,
  zoomMultiplier,
}: {
  doc: PDFDocumentProxy
  pageNumber: number
  maxWidthPx: number
  zoomMultiplier: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const taskRef = useRef<{ cancel: () => void } | null>(null)

  useEffect(() => {
    let alive = true
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")

    async function paint() {
      if (!canvas || !ctx || maxWidthPx < 64) return
      const page = await doc.getPage(pageNumber)
      if (!alive) {
        page.cleanup()
        return
      }
      const base = page.getViewport({ scale: 1 })
      const fit = maxWidthPx / base.width
      const scale = fit * zoomMultiplier
      const viewport = page.getViewport({ scale })

      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      const renderTask = page.render({
        canvas,
        canvasContext: ctx,
        viewport,
        transform: [dpr, 0, 0, dpr, 0, 0],
      })

      taskRef.current = renderTask

      try {
        await renderTask.promise
      } finally {
        page.cleanup()
        if (taskRef.current === renderTask) {
          taskRef.current = null
        }
      }
    }

    void paint().catch(() => {
      /* handled by parent */
    })

    return () => {
      alive = false
      taskRef.current?.cancel()
      taskRef.current = null
    }
  }, [doc, pageNumber, maxWidthPx, zoomMultiplier])

  return (
    <div className="flex w-full justify-center bg-white">
      <canvas ref={canvasRef} className="block max-w-full shadow-sm" />
    </div>
  )
}

/**
 * عارض PDF عبر PDF.js على canvas — بدون شريط المتصفّح الافتراضي (تحميل / نافذة جديدة).
 * لا يمنع المستخدم المُصَمَّم على الاستخراج؛ يقلّل التسريب العابر.
 */
export function PdfCanvasViewer({ src, title, className, frameClassName }: Props) {
  const safeSrc = src.trim()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [maxW, setMaxW] = useState(600)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (typeof w === "number" && w > 0) {
        setMaxW(Math.floor(w - 8))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!safeSrc) return
    let cancelled = false
    let proxy: PDFDocumentProxy | null = null

    async function load() {
      setLoading(true)
      setLoadError(null)
      setDoc(null)
      setNumPages(0)

      try {
        const pdfjs = await ensurePdfJs()
        const task = pdfjs.getDocument({
          url: safeSrc,
          withCredentials: false,
        })
        proxy = await task.promise
        if (cancelled) {
          await proxy.destroy()
          return
        }
        setDoc(proxy)
        setNumPages(proxy.numPages)
      } catch {
        if (!cancelled) {
          setLoadError("تعذّر فتح ملف PDF داخل المتصفّح.")
        }
        if (proxy && !cancelled) {
          try {
            await proxy.destroy()
          } catch {
            /* ignore */
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      if (proxy) {
        void proxy.destroy()
      }
    }
  }, [safeSrc])

  const zoomIn = useCallback(() => setZoom((z) => Math.min(2.75, +(z + 0.15).toFixed(2))), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.65, +(z - 0.15).toFixed(2))), [])

  if (!safeSrc) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 rounded-xl border bg-muted/30 p-8", className)}>
        <p className="text-center text-sm text-muted-foreground">لا يتوفر رابط للملف</p>
      </div>
    )
  }

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
        <span className="truncate ps-1" dir="ltr">
          {title ?? "PDF"}
          {!loading && numPages > 0 ? ` · ${numPages} صفحة` : null}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={zoomOut} aria-label="تصغير">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] tabular-nums text-center">{Math.round(zoom * 100)}٪</span>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={zoomIn} aria-label="تكبير">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={wrapRef}
        dir="ltr"
        onContextMenu={(e) => {
          e.preventDefault()
        }}
        className={cn(
          "relative w-full min-h-[60vh] max-h-[80vh] overflow-y-auto rounded-xl border bg-muted/30 shadow-inner select-none",
          frameClassName
        )}
      >
        {loading ?
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">جاري فتح الملف…</p>
          </div>
        : loadError ?
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            {loadError}
          </div>
        : doc ?
          <div className="flex flex-col gap-3 p-3">
            {Array.from({ length: numPages }, (_, i) => (
              <PdfPageCanvas
                key={`${safeSrc}-p${i + 1}`}
                doc={doc}
                pageNumber={i + 1}
                maxWidthPx={maxW}
                zoomMultiplier={zoom}
              />
            ))}
          </div>
        : null}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        العرض داخل المنصّة فقط؛ لا يظهر شريط تحميل المتصفّح الافتراضي. النسخ الكامل ممكن عبر أدوات متقدّمة — الحماية هنا للاستخدام العادي.
      </p>
    </div>
  )
}
