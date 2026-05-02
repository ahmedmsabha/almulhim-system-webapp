import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton rounded-md bg-muted', className)}
      aria-hidden="true"
    />
  )
}

export function LessonCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' | 'horizontal' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <Skeleton className="h-14 w-20 flex-shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    )
  }

  if (variant === 'horizontal') {
    return (
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card sm:flex-row">
        <Skeleton className="aspect-video h-auto w-full sm:h-32 sm:w-48" />
        <div className="flex-1 p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function PDFCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' | 'list' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <Skeleton className="h-12 w-12 flex-shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-14 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

export function AnnouncementCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-start gap-3 rounded-lg border-s-2 border-muted bg-muted/30 p-3">
        <Skeleton className="h-4 w-4 mt-0.5 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function StudentCardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-xl border bg-card p-4">
      <Skeleton className="h-12 w-12 flex-shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <LessonCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 2 }).map((_, i) => (
              <AnnouncementCardSkeleton key={i} variant="compact" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { Skeleton }
