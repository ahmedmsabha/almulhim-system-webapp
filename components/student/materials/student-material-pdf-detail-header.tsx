"use client"

import Link from "next/link"
import { ArrowRight, FileText } from "lucide-react"
import { DownloadBadge, DownloadButton } from "@/components/shared/media/download-button"
import { useStudentPdfOffline } from "@/lib/client/use-student-pdf-offline"

type Props = {
  materialId: string
  title: string
  subtitle: string
}

/** شريط علوي واحد لتفادي تكرار حالة التحميل بين الشارة والزر. */
export function StudentMaterialPdfDetailHeader({ materialId, title, subtitle }: Props) {
  const { displayStatus, download, remove } = useStudentPdfOffline(materialId)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/student/materials"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          <span className="hidden sm:inline">العودة</span>
        </Link>
        <span className="hidden h-5 w-px bg-border sm:inline-block" />
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-medium line-clamp-1">{title}</span>
        </div>
        {displayStatus !== "not_downloaded" ?
          <DownloadBadge status={displayStatus} />
        : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs tabular-nums text-muted-foreground sm:text-sm">{subtitle}</span>
        <DownloadButton
          status={displayStatus}
          onDownload={download}
          onRemove={remove}
          size="sm"
          variant="outline"
        />
      </div>
    </div>
  )
}
