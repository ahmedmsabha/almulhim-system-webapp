import { Pin, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/types'
import { formatRelativeArabic } from '@/lib/format-relative-ar'

interface AnnouncementCardProps {
  announcement: Announcement
  variant?: 'default' | 'compact'
  className?: string
}

function formatAbsoluteDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function AnnouncementCard({
  announcement,
  variant = 'default',
  className,
}: AnnouncementCardProps) {
  const relativePublished = formatRelativeArabic(announcement.published_at)

  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'transition-colors hover:bg-muted/40',
          announcement.is_pinned && 'border-s-4 border-accent/70 bg-accent/[0.05]',
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {announcement.is_pinned && (
              <Pin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <h4 className="font-semibold leading-snug text-foreground">{announcement.title}</h4>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {announcement.body}
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">{relativePublished}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'overflow-hidden shadow-sm transition-shadow hover:shadow-md',
        announcement.is_pinned && 'border-s-4 border-accent/60 bg-accent/[0.03]',
        className
      )}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            {announcement.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-semibold text-accent">
                <Pin className="size-3 shrink-0" aria-hidden />
                مثبت
              </span>
            )}
            <h3 className="text-xl font-bold leading-snug tracking-tight text-foreground md:text-[1.35rem]">
              {announcement.title}
            </h3>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="size-3 shrink-0" aria-hidden />
              <span className="font-medium">{relativePublished}</span>
            </span>
            <span className="text-[11px] font-normal">{formatAbsoluteDate(announcement.published_at)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {announcement.image_url && (
          <AspectRatio ratio={16 / 9}>
            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted">
              <img
                src={announcement.image_url}
                alt={announcement.title}
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          </AspectRatio>
        )}
        <p className="prose-arabic whitespace-pre-wrap leading-relaxed text-muted-foreground">
          {announcement.body}
        </p>
      </CardContent>
    </Card>
  )
}
