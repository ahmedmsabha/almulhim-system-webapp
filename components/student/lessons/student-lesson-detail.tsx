'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { DownloadButton } from '@/components/DownloadButton'
import { LessonCard } from '@/components/student/lessons/lesson-card'
import { VideoPlayer } from '@/components/VideoPlayer'
import { cn } from '@/lib/utils'
import type { LessonWithProgress } from '@/types'
import {
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronDown,
} from 'lucide-react'

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} دقيقة`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} ساعة${remainingMinutes > 0 ? ` و ${remainingMinutes} دقيقة` : ''}`
}

interface StudentLessonDetailProps {
  lesson: LessonWithProgress
  relatedLessons: LessonWithProgress[]
  isSubscriptionExpired: boolean
}

export function StudentLessonDetail({
  lesson,
  relatedLessons,
  isSubscriptionExpired,
}: StudentLessonDetailProps) {
  const [relatedOpenMobile, setRelatedOpenMobile] = useState(false)

  const progress = lesson.watch_progress?.progress || 0
  const isCompleted = lesson.watch_progress?.completed || false

  return (
    <div className="space-y-6">
      <Link
        href="/student/lessons"
        className="focus-ring inline-flex min-h-11 touch-target-sm items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground sm:min-h-9"
      >
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        <span>العودة للدروس</span>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <AspectRatio ratio={16 / 9}>
              <div className="relative h-full w-full bg-muted">
                <VideoPlayer
                  lesson={lesson}
                  blockedBySubscription={isSubscriptionExpired && !lesson.is_preview}
                  className="absolute inset-0 h-full w-full rounded-none"
                />
                {progress > 0 && !isCompleted && !lesson.is_preview && (
                  <div className="pointer-events-none absolute bottom-0 start-0 end-0 z-[4] bg-background/10">
                    <Progress value={progress} className="h-2.5 rounded-none" />
                  </div>
                )}
              </div>
            </AspectRatio>
            <CardContent className="border-t bg-muted/20 px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4 gap-y-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" />
                    {formatDuration(lesson.duration)}
                  </span>
                  {progress > 0 && (
                    <span className="text-foreground/90">
                      {isCompleted ? 'مكتمل' : `${progress}% تم المشاهدة`}
                    </span>
                  )}
                </div>
                {!lesson.is_preview ?
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <DownloadButton videoId={lesson.id} className="w-full max-w-xs sm:w-auto" />
                  </div>

                : null}
              </div>
            </CardContent>
          </Card>

          <Collapsible
            open={relatedOpenMobile}
            onOpenChange={setRelatedOpenMobile}
            className="rounded-xl border bg-card lg:hidden"
          >
            <CollapsibleTrigger className="focus-ring flex w-full min-h-[44px] items-center justify-between gap-3 px-4 py-3 text-start text-sm font-medium">
              <span>دروس ذات صلة بالوحدة</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform rtl:rotate-180',
                  relatedOpenMobile && 'rotate-180 rtl:rotate-0'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t px-4 py-4">
              <div className="space-y-3">
                {relatedLessons.length > 0 ? (
                  relatedLessons.map((relatedLesson) => (
                    <LessonCard
                      key={relatedLesson.id}
                      lesson={relatedLesson}
                      variant="compact"
                      showDownload={false}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    لا توجد دروس أخرى في هذه الوحدة
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <span className="inline-block rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {lesson.unit}
                  </span>
                  <CardTitle className="text-balance text-2xl leading-snug">{lesson.title}</CardTitle>
                </div>
                {isCompleted && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    <CheckCircle className="h-3 w-3" />
                    مكتمل
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="prose-arabic text-base leading-relaxed text-muted-foreground">
                {lesson.description}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-muted/30">
            <CardContent className="flex items-start gap-3 p-4 sm:p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <div className="text-sm leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">ملاحظة أمنية</p>
                <p className="mt-1">
                  هذا المحتوى محمي ومخصص للمشتركين فقط. يُرجى عدم مشاركة رابط الفيديو أو
                  تسجيله. نظام المنصة يتتبع جميع المشاهدات.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop related lessons */}
        <aside className="hidden space-y-6 lg:block">
          <Card className="sticky top-[5.25rem] border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">دروس الوحدة</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-10rem)] space-y-3 overflow-y-auto pe-1 scrollbar-thin">
              {relatedLessons.length > 0 ? (
                relatedLessons.map((relatedLesson) => (
                  <LessonCard
                    key={relatedLesson.id}
                    lesson={relatedLesson}
                    variant="compact"
                    showDownload={false}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد دروس أخرى في هذه الوحدة</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="h-11 w-full justify-start gap-2" asChild>
                <Link href="/student/materials">ملفات PDF المتعلقة</Link>
              </Button>
              <Button variant="outline" className="h-11 w-full justify-start gap-2" asChild>
                <Link href="/student/messages">سؤال المدرس</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
