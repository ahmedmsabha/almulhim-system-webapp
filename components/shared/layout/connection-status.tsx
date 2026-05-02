'use client'

import { Wifi, WifiOff, WifiLow } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConnectionStatus as ConnectionStatusValue } from '@/types'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'

function mapToConnectionStatus(state: {
  isOnline: boolean
  isWeak: boolean
}): ConnectionStatusValue {
  if (!state.isOnline) return 'offline'
  if (state.isWeak) return 'weak'
  return 'online'
}

export function ConnectionStatusBanner() {
  const { isOnline, isWeak } = useOfflineStatus()
  const status = mapToConnectionStatus({ isOnline, isWeak })
  /** Offline messaging is handled by `OfflineBanner` in the student layout. */
  const isVisible = status === 'weak'

  if (!isVisible) return null

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center gap-2 border-b px-3 py-1.5 text-[11px] font-medium leading-tight shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-sm sm:text-xs',
        'border-warning/40 bg-warning/10 text-warning-foreground'
      )}
    >
      <WifiLow className="size-3.5 shrink-0 opacity-90" aria-hidden />
      <span className="text-pretty">اتصال ضعيف — قد يبطء تحميل الفيديو</span>
    </div>
  )
}

export function ConnectionStatusIndicator({ className }: { className?: string }) {
  const { isOnline, isWeak } = useOfflineStatus()
  const status = mapToConnectionStatus({ isOnline, isWeak })

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      {status === 'online' && (
        <>
          <Wifi className="size-3.5 text-success" aria-hidden />
          <span className="hidden sm:inline">متصل</span>
        </>
      )}
      {status === 'weak' && (
        <>
          <WifiLow className="size-3.5 text-warning" aria-hidden />
          <span className="hidden text-warning sm:inline">اتصال ضعيف</span>
        </>
      )}
      {status === 'offline' && (
        <>
          <WifiOff className="size-3.5 text-destructive" aria-hidden />
          <span className="hidden text-destructive sm:inline">غير متصل</span>
        </>
      )}
    </div>
  )
}

/** Compact indicator for layouts (e.g. admin). */
export function ConnectionStatus() {
  return <ConnectionStatusIndicator />
}
