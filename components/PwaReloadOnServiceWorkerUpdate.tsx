'use client'

import { useEffect } from 'react'

/** يمنع إعادة التحميل عند أول تفعيل للـ SW فقط؛ عند نشر نسخة جديدة يعيد التحميل ليتطابق عميل JS مع الخادم (يمنع failed-to-find-server-action). */
const SW_SESSION_KEY = 'mulhim-sw-saw-controller'

export function PwaReloadOnServiceWorkerUpdate() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const onControllerChange = () => {
      try {
        if (!navigator.serviceWorker.controller) return
        if (!sessionStorage.getItem(SW_SESSION_KEY)) {
          sessionStorage.setItem(SW_SESSION_KEY, '1')
          return
        }
      } catch {
        return
      }
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  return null
}
