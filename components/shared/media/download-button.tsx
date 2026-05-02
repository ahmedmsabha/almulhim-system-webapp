'use client'

import { useState } from 'react'
import { Bookmark, Check, Download, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { DownloadStatus } from '@/types'

export interface DownloadButtonProps {
  status: DownloadStatus
  onDownload: () => Promise<void>
  onRemove?: () => Promise<void>
  size?: 'sm' | 'default' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  showLabel?: boolean
  className?: string
}

export function DownloadButton({
  status,
  onDownload,
  onRemove,
  size = 'default',
  variant = 'outline',
  showLabel = true,
  className,
}: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    if (status === 'downloading' || isLoading) return
    setIsLoading(true)
    try {
      await onDownload()
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async () => {
    if (isLoading || !onRemove) return
    setIsLoading(true)
    try {
      await onRemove()
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'downloaded' && onRemove) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={size}
              onClick={handleRemove}
              disabled={isLoading}
              className={cn('text-success hover:text-destructive', className)}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {showLabel && size !== 'icon' && <span>تم التحميل</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>اضغط لإزالة من التحميلات</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={status === 'downloading' || isLoading}
      className={cn(
        status === 'failed' && 'text-destructive border-destructive',
        className
      )}
    >
      {status === 'downloading' || isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : status === 'failed' ? (
        <AlertCircle className="h-4 w-4" />
      ) : status === 'downloaded' ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {showLabel && size !== 'icon' && (
        <span>
          {status === 'downloading'
            ? 'جاري التحميل...'
            : status === 'failed'
              ? 'فشل التحميل'
              : status === 'downloaded'
                ? 'تم التحميل'
                : 'تحميل'}
        </span>
      )}
    </Button>
  )
}

export function DownloadBadge({ status }: { status: DownloadStatus }) {
  if (status === 'not_downloaded') return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'downloaded' && 'bg-success/15 text-success ring-1 ring-success/25',
        status === 'downloading' && 'bg-info/12 text-info ring-1 ring-info/20',
        status === 'failed' && 'bg-destructive/12 text-destructive ring-1 ring-destructive/25'
      )}
    >
      {status === 'downloaded' && (
        <>
          <span className="relative flex size-2 items-center justify-center" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-success/40" />
            <span className="relative size-1.5 rounded-full bg-success shadow-sm" />
          </span>
          <Bookmark className="size-3.5 shrink-0 fill-success text-success" strokeWidth={1.5} />
          <span>محمّل</span>
        </>
      )}
      {status === 'downloading' && (
        <>
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          <span>جاري التحميل</span>
        </>
      )}
      {status === 'failed' && (
        <>
          <AlertCircle className="size-3.5 shrink-0" />
          <span>فشل التحميل</span>
        </>
      )}
    </span>
  )
}
