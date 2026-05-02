'use client'

import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Inbox,
  Search as SearchIcon,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  variant?: 'default' | 'compact' | 'card'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-8 text-center',
          className
        )}
      >
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {description && (
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/25 p-10 text-center',
          className
        )}
      >
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Icon className="size-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
        {action}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      <div className="mb-6 flex h-28 w-full max-w-sm items-center justify-center rounded-2xl bg-muted/80 p-8">
        <Icon className="size-14 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="mb-3 text-xl font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mb-10 max-w-md text-base leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  )
}

export function NoResultsState({
  searchTerm,
  onClear,
}: {
  searchTerm?: string
  onClear?: () => void
}) {
  return (
    <EmptyState
      icon={SearchIcon}
      title="لا توجد نتائج"
      description={
        searchTerm
          ? `لم نجد نتائج تطابق «${searchTerm}». جرِّب بحثًا مختلفًا.`
          : 'لم نجد أي نتائج مطابقة.'
      }
      action={
        onClear && (
          <button type="button" onClick={onClear} className="focus-ring text-sm font-medium text-primary">
            مسح البحث
          </button>
        )
      }
      variant="compact"
    />
  )
}

export function NoDataState({
  itemName,
  action,
}: {
  itemName: string
  action?: React.ReactNode
}) {
  return (
    <EmptyState
      icon={Inbox}
      title={`لا يوجد ${itemName}`}
      description={`لم يتم إضافة أي ${itemName} بعد.`}
      action={action}
      variant="card"
    />
  )
}

export function OfflineState() {
  return (
    <EmptyState
      icon={WifiOff}
      title="لا يوجد اتصال"
      description="يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى."
      variant="default"
    />
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="حدث خطأ"
      description={message ?? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring min-h-11 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        )
      }
      variant="default"
    />
  )
}
