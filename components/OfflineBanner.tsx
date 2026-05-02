'use client'

import { useEffect, useRef, useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'

export function OfflineBanner() {
  /** لا نعرض شريط الشبكة على الخادم أو قبل التثبيت — يمنع تعارض الترطيب مع navigator.onLine */
  const [mounted, setMounted] = useState(false)
  const { isOnline } = useOnlineStatus()
  const prevOnline = useRef<boolean | null>(null)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (prevOnline.current === null) {
      prevOnline.current = isOnline
      return
    }
    const wasOffline = prevOnline.current === false
    prevOnline.current = isOnline
    if (!wasOffline || !isOnline) return
    setShowReconnected(true)
    const t = window.setTimeout(() => {
      setShowReconnected(false)
    }, 3000)
    return () => window.clearTimeout(t)
  }, [isOnline, mounted])

  if (!mounted) return null

  const showOffline = !isOnline
  const visible = showOffline || showReconnected

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed start-0 end-0 top-0 z-[100] px-3 py-2 text-center text-sm font-medium transition-all duration-300 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0',
        showOffline && 'bg-destructive/95 text-destructive-foreground shadow-md',
        showReconnected && 'bg-emerald-600 text-white shadow-md'
      )}
    >
      {showOffline && '🔴 لا يوجد اتصال — تعمل في وضع عدم الاتصال'}
      {showReconnected && !showOffline && '🟢 عاد الاتصال'}
    </div>
  )
}
