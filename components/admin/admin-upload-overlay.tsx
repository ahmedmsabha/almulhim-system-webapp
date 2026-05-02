"use client"

import { Loader2 } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export function AdminUploadOverlay({
  open,
  percent,
  title,
  subtitle,
}: {
  open: boolean
  percent: number
  title: string
  subtitle?: string
}) {
  if (!open) return null

  const safe = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-md px-4 animate-in fade-in duration-200"
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/25 bg-card p-8 shadow-2xl",
          "shadow-primary/15 ring-1 ring-primary/10"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
        <div className="relative space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">{title}</p>
            {subtitle ?
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            : null}
          </div>
          <div className="space-y-3">
            <div className="flex items-baseline justify-center gap-1 tabular-nums">
              <span className="text-4xl font-bold tracking-tight text-primary">{safe}</span>
              <span className="text-xl font-semibold text-muted-foreground">%</span>
            </div>
            <Progress value={safe} className="h-3 bg-muted" />
          </div>
          <p className="text-xs text-muted-foreground">
            لا تغلق الصفحة حتى يكتمل الإجراء لتجنّب تعارض الرفع.
          </p>
        </div>
      </div>
    </div>
  )
}
