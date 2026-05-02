'use client'

import { FileText, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DownloadButton, DownloadBadge } from '@/components/shared/media/download-button'
import { cn } from '@/lib/utils'
import { useStudentPdfOffline } from '@/lib/client/use-student-pdf-offline'
import type { MaterialWithStatus, PDFMaterial } from '@/types'

interface PDFCardProps {
  material: MaterialWithStatus
  variant?: 'default' | 'compact' | 'list'
  showDownload?: boolean
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`
}

const categoryIconWrap: Record<PDFMaterial['category'], string> = {
  شرح: 'bg-info/12 text-info',
  تمارين: 'bg-accent/12 text-accent',
  امتحانات: 'bg-warning/14 text-warning',
  حلول: 'bg-success/12 text-success',
  ملخصات: 'bg-primary/12 text-primary',
}

export function PDFCard({
  material,
  variant = 'default',
  showDownload = true,
  className,
}: PDFCardProps) {
  const { displayStatus, download, remove } = useStudentPdfOffline(
    material.id,
    material.download_status ?? 'not_downloaded'
  )

  const iconRing = categoryIconWrap[material.category] ?? 'bg-muted text-muted-foreground'

  if (variant === 'list') {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between',
          className
        )}
      >
        <div className="flex items-start gap-3 sm:items-center">
          <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl shadow-inner', iconRing)}>
            <FileText className="size-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold leading-snug text-foreground">{material.title}</h4>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="rounded-md bg-muted/80 px-2 py-0.5 font-medium text-foreground/85">
                {material.category}
              </span>
              <span>{material.page_count} صفحة</span>
              <span className="tabular-nums">{formatFileSize(material.file_size)}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          {displayStatus !== 'not_downloaded' && <DownloadBadge status={displayStatus} />}
          <Button asChild size="sm" variant="outline" className="min-h-11 gap-2 sm:min-h-9">
            <Link href={`/student/materials/${material.id}`}>
              <ExternalLink className="size-4" />
              <span>فتح</span>
            </Link>
          </Button>
          {showDownload && (
            <DownloadButton
              status={displayStatus}
              onDownload={download}
              onRemove={remove}
              size="sm"
              variant="ghost"
              showLabel={false}
              className="min-h-11 min-w-11 sm:size-9"
            />
          )}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Link href={`/student/materials/${material.id}`}>
        <Card className={cn('transition-colors hover:bg-muted/50', className)}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl shadow-inner', iconRing)}>
              <FileText className="size-[22px]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold leading-snug">{material.title}</h4>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                <span>{material.page_count} صفحة</span>
                <span aria-hidden className="mx-1.5 text-border">
                  ·
                </span>
                <span>{formatFileSize(material.file_size)}</span>
              </p>
            </div>
            {displayStatus === 'downloaded' && <DownloadBadge status="downloaded" />}
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Card className={cn('overflow-hidden border-border/60 shadow-sm', className)}>
      <CardContent className="flex flex-col p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl shadow-inner', iconRing)}>
            <FileText className="size-7" strokeWidth={2} aria-hidden />
          </div>
          <DownloadBadge status={displayStatus} />
        </div>
        <h3 className="mb-1 text-lg font-bold leading-snug text-foreground line-clamp-2">{material.title}</h3>
        {material.description && (
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">{material.description}</p>
        )}
        <div className="mt-auto pt-3 text-xs tabular-nums text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium text-secondary-foreground">
            {material.category}
          </span>
          <span>{material.page_count} صفحة</span>
          <span>{formatFileSize(material.file_size)}</span>
        </div>
        <div className="mt-5 flex gap-2">
          <Button asChild className="min-h-11 flex-1 sm:min-h-10">
            <Link href={`/student/materials/${material.id}`}>
              <ExternalLink className="size-4" />
              <span>فتح</span>
            </Link>
          </Button>
          {showDownload && (
            <DownloadButton
              status={displayStatus}
              onDownload={download}
              onRemove={remove}
              size="icon"
              variant="outline"
              showLabel={false}
              className="min-h-11 min-w-11 sm:size-10"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
