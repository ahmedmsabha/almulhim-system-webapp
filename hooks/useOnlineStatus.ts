'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * الحالة الأولى ثابتة (متصل) لتطابق SSR وأول إطار على العميل — ثم المزامنة من navigator بعد التثبيت.
 * يمنع تعارض الترطيب كما في OfflineBanner.
 */
export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true)

  const sync = useCallback(() => {
    try {
      if (typeof navigator === 'undefined') return
      setIsOnline(navigator.onLine)
    } catch {
      setIsOnline(true)
    }
  }, [])

  useEffect(() => {
    try {
      sync()
      const onOnline = () => {
        try {
          setIsOnline(true)
        } catch {
          /* ignore */
        }
      }
      const onOffline = () => {
        try {
          setIsOnline(false)
        } catch {
          /* ignore */
        }
      }
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
      return () => {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('offline', onOffline)
      }
    } catch {
      return undefined
    }
  }, [sync])

  return { isOnline }
}
