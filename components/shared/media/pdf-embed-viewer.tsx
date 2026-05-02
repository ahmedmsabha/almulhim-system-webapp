"use client"

import { useMemo } from "react"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Props = {
  /** رابط عام، أو blob:، أو مسار مطلق مثل `/api/student/pdf/…` */
  src: string
  title?: string
  className?: string
  frameClassName?: string
  /**
   * عند الطلاب خلّيه false حتى لا يظهر الرابط الذي يمكن نسخه في تبويب جديد علنياً (مثل Supabase العامة).
   * للمعاينة الإدارية يمكن تشغيله.
   */
  allowExternalTab?: boolean
}

/**
 * عارض PDF عبر iframe. للمحتوى الحسّاس استخدم مسارًا محمّيًا أو blob: وفقِّل allowExternalTab.
 */
export function PdfEmbedViewer({
  src,
  title,
  className,
  frameClassName,
  allowExternalTab = false,
}: Props) {
  const safeSrc = useMemo(() => src.trim(), [src])

  const iframeSrcMemo = useMemo(() => {
    if (!safeSrc) return ""
    return safeSrc.startsWith("blob:") ? safeSrc : `${safeSrc}#toolbar=1`
  }, [safeSrc])

  if (!safeSrc) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 rounded-xl border bg-muted/30 p-8", className)}>
        <p className="text-center text-sm text-muted-foreground">لا يتوفر رابط للملف</p>
      </div>
    )
  }

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {allowExternalTab ?
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={safeSrc} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              تبويب جديد
            </a>
          </Button>
        </div>
      : null}
      <div
        className={cn(
          "relative w-full min-h-[60vh] overflow-hidden rounded-xl border bg-muted/20 shadow-inner",
          frameClassName
        )}
      >
        <iframe
          title={title ?? "PDF"}
          src={iframeSrcMemo || safeSrc}
          className="absolute inset-0 h-full w-full border-0"
          referrerPolicy="no-referrer-when-downgrade"
          loading="lazy"
        />
      </div>
      {allowExternalTab ?
        <p className="text-center text-[11px] text-muted-foreground">
          إن لم يظهر الملف هنا، استخدم «تبويب جديد» (بعض المتصفحات تقيّد عرض PDF داخل iframe).
        </p>
      : (
        <p className="text-center text-[11px] text-muted-foreground">
          للقراءة دون تصفّح مفتوح لمزوّد الملفات، استخدم زر التحميل داخل المنصّة؛ تُخزَّن النسخة محلياً لمستخدمك فقط.
        </p>
      )}
    </div>
  )
}
