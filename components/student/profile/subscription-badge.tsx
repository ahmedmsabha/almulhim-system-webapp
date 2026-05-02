import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Subscription, StudentSubscriptionUiStatus } from '@/types'

interface SubscriptionBadgeProps {
  status: Subscription['status'] | StudentSubscriptionUiStatus
  size?: 'sm' | 'default'
  showLabel?: boolean
  className?: string
}

export function SubscriptionBadge({
  status,
  size = 'default',
  showLabel = true,
  className,
}: SubscriptionBadgeProps) {
  const config = {
    none: {
      icon: AlertCircle,
      label: 'بانتظار التفعيل',
      className: 'bg-muted text-muted-foreground border-border',
    },
    active: {
      icon: CheckCircle,
      label: 'نشط',
      className: 'bg-success/10 text-success border-success/20',
    },
    expiring_soon: {
      icon: Clock,
      label: 'ينتهي قريباً',
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    expired: {
      icon: XCircle,
      label: 'منتهي',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
    cancelled: {
      icon: AlertCircle,
      label: 'ملغي',
      className: 'bg-muted text-muted-foreground border-muted',
    },
  }

  const { icon: Icon, label, className: statusClassName } = config[
    status as keyof typeof config
  ]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        statusClassName,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {showLabel && <span>{label}</span>}
    </span>
  )
}
