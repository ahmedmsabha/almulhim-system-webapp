'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const STORAGE_DISMISS = 'mulhim-ios-install-dismissed'

function isIOSSafariWeb(): boolean {
  try {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    const isIosDevice = /iPhone|iPad/.test(ua)
    const isEmbeddedBrowser = /CriOS|FxiOS/.test(ua)
    return isIosDevice && !isEmbeddedBrowser
  } catch {
    return false
  }
}

export function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (localStorage.getItem(STORAGE_DISMISS) === '1') return
      if (window.matchMedia('(display-mode: standalone)').matches) return
      if (!isIOSSafariWeb()) return
      setVisible(true)
    } catch {
      /* ignore */
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_DISMISS, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="إضافة إلى الشاشة الرئيسية على آيفون"
      className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[99] max-w-md animate-in slide-in-from-top-4 duration-300 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 rtl:sm:translate-x-1/2"
    >
      <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-lg">
        <p className="leading-relaxed text-foreground">
          اضغط زر المشاركة ← ثم «إضافة إلى الشاشة الرئيسية»
        </p>
        <Button type="button" size="sm" variant="secondary" className="mt-3 w-full" onClick={dismiss}>
          فهمت
        </Button>
      </div>
    </div>
  )
}
