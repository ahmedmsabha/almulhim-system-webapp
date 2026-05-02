'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const STORAGE_DISMISS = 'mulhim-mac-safari-install-dismissed'

/** سفاري على ماك (ليس كروم/إيدج) — لا يدعم beforeinstallprompt */
function isMacDesktopSafari(): boolean {
  try {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    if (!/Macintosh/.test(ua)) return false
    if (!/Safari/.test(ua)) return false
    if (/Chrome|Chromium|Edg|OPR|FxiOS|CriOS/.test(ua)) return false
    return true
  } catch {
    return false
  }
}

export function MacSafariInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (localStorage.getItem(STORAGE_DISMISS) === '1') return
      if (window.matchMedia('(display-mode: standalone)').matches) return
      if (!isMacDesktopSafari()) return
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
      aria-label="إضافة التطبيق من سفاري على الماك"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[99] max-w-md animate-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:start-4"
    >
      <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-lg">
        <p className="leading-relaxed text-foreground">
          في سفاري على الماك لا يظهر زر تثبيت في شريط العنوان. لإضافة التطبيق إلى
          الشريط: من القائمة اختر <span className="font-medium">ملف</span> ثم{' '}
          <span className="font-medium">إضافة إلى الطاولة</span> (أو Add to Dock).
        </p>
        <Button type="button" size="sm" variant="secondary" className="mt-3 w-full" onClick={dismiss}>
          فهمت
        </Button>
      </div>
    </div>
  )
}
