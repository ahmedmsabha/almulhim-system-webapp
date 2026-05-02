'use client'

import { Play, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DownloadButton, DownloadBadge } from '@/components/shared/media/download-button'
import { useOfflineLessonManifest } from '@/hooks/useOfflineLessonManifest'
import { cn } from '@/lib/utils'
import type { LessonWithProgress } from '@/types'

interface LessonCardProps {
  lesson: LessonWithProgress
  variant?: 'default' | 'compact' | 'horizontal'
  showProgress?: boolean
  showDownload?: boolean
  className?: string
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} دقيقة`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} ساعة${remainingMinutes > 0 ? ` و ${remainingMinutes} دقيقة` : ''}`
}

export function LessonCard({
  lesson,
  variant = 'default',
  showProgress = true,
  showDownload = true,
  className,
}: LessonCardProps) {
  const progress = lesson.watch_progress?.progress || 0
  const isCompleted = lesson.watch_progress?.completed || false
  const offlineAvailable = useOfflineLessonManifest(lesson.id)

  const handleDownload = async () => {
    // TODO: Implement actual download logic with service worker
    console.log('Downloading lesson:', lesson.id)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  if (variant === 'compact') {
    return (
      <Link href={`/student/lessons/${lesson.id}`}>
        <Card className={cn('transition-colors hover:bg-muted/50', className)}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
              {lesson.thumbnail_url ? (
                <img
                  src={lesson.thumbnail_url}
                  alt={lesson.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Play className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {offlineAvailable && (
                <span
                  className="absolute bottom-0.5 start-0.5 rounded bg-background/85 px-1 text-[10px] leading-none shadow-sm"
                  title="متاح بدون اتصال"
                >
                  📥
                </span>
              )}
              {isCompleted && (
                <div className="absolute inset-0 flex items-center justify-center bg-success/80">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-medium">{lesson.title}</h4>
              <p className="text-xs text-muted-foreground">{formatDuration(lesson.duration)}</p>
              {showProgress && progress > 0 && !isCompleted && (
                <Progress value={progress} className="mt-2 h-2" />
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  if (variant === 'horizontal') {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <div className="flex flex-col sm:flex-row">
          <div className="relative aspect-video h-auto w-full sm:h-32 sm:w-48">
            {lesson.thumbnail_url ? (
              <img
                src={lesson.thumbnail_url}
                alt={lesson.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Play className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            {lesson.is_preview && (
              <span className="absolute end-2 top-2 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground shadow-sm">
                معاينة مجانية
              </span>
            )}
            {offlineAvailable && (
              <span
                className="absolute bottom-2 end-2 rounded bg-background/85 px-1.5 py-0.5 text-xs shadow-sm"
                title="متاح بدون اتصال"
              >
                📥
              </span>
            )}
            {isCompleted && (
              <div className="absolute bottom-2 start-2 flex items-center gap-1 rounded-md bg-success/90 px-2 py-0.5 text-xs text-white">
                <CheckCircle className="h-3 w-3" />
                <span>مكتمل</span>
              </div>
            )}
          </div>
          <CardContent className="flex flex-1 flex-col justify-between p-4">
            <div>
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{lesson.title}</h3>
                {lesson.download_status && (
                  <DownloadBadge status={lesson.download_status} />
                )}
              </div>
              <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                {lesson.description}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(lesson.duration)}
                </span>
                <span className="rounded bg-secondary px-2 py-0.5">{lesson.unit}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button asChild size="sm">
                <Link href={`/student/lessons/${lesson.id}`}>
                  <Play className="h-4 w-4" />
                  <span>{progress > 0 ? 'متابعة المشاهدة' : 'مشاهدة'}</span>
                </Link>
              </Button>
              {showDownload && !lesson.is_preview && (
                <DownloadButton
                  status={lesson.download_status || 'not_downloaded'}
                  onDownload={handleDownload}
                  size="sm"
                  variant="outline"
                  showLabel={false}
                />
              )}
            </div>
            {showProgress && progress > 0 && !isCompleted && (
              <Progress value={progress} className="mt-3 h-2.5" />
            )}
          </CardContent>
        </div>
      </Card>
    )
  }

  // Default vertical card
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="relative aspect-video">
        {lesson.thumbnail_url ? (
          <img
            src={lesson.thumbnail_url}
            alt={lesson.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {lesson.is_preview && (
          <span className="absolute end-2 top-2 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground shadow-sm">
            معاينة مجانية
          </span>
        )}
        {offlineAvailable && (
          <span
            className="absolute bottom-2 end-2 rounded bg-background/85 px-1.5 py-0.5 text-xs shadow-sm"
            title="متاح بدون اتصال"
          >
            📥
          </span>
        )}
        <div className="absolute bottom-2 start-2 flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-xs text-white">
          <Clock className="h-3 w-3" />
          {formatDuration(lesson.duration)}
        </div>
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-success/20">
            <div className="rounded-full bg-success p-2">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-snug line-clamp-2">{lesson.title}</h3>
          {lesson.download_status && (
            <DownloadBadge status={lesson.download_status} />
          )}
        </div>
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">
          {lesson.description}
        </p>
        <span className="mb-3 inline-block rounded bg-secondary px-2 py-0.5 text-xs">
          {lesson.unit}
        </span>
        {showProgress && progress > 0 && !isCompleted && (
          <div className="mb-3">
            <Progress value={progress} className="h-2.5" />
            <p className="mt-1 text-xs text-muted-foreground">{progress}% مكتمل</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button asChild className="flex-1">
            <Link href={`/student/lessons/${lesson.id}`}>
              <Play className="h-4 w-4" />
              <span>{progress > 0 ? 'متابعة' : 'مشاهدة'}</span>
            </Link>
          </Button>
          {showDownload && !lesson.is_preview && (
            <DownloadButton
              status={lesson.download_status || 'not_downloaded'}
              onDownload={handleDownload}
              size="icon"
              variant="outline"
              showLabel={false}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
