'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const STORAGE_INSTALLED = 'mulhim-pwa-installed'

type BeforeInstallPromptEventType = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const deferredRef = useRef<BeforeInstallPromptEventType | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (localStorage.getItem(STORAGE_INSTALLED) === '1') return
      if (window.matchMedia('(display-mode: standalone)').matches) return

      const onBefore = (e: Event) => {
        try {
          e.preventDefault()
          deferredRef.current = e as BeforeInstallPromptEventType
          setVisible(true)
        } catch {
          /* ignore */
        }
      }

      const onInstalled = () => {
        try {
          localStorage.setItem(STORAGE_INSTALLED, '1')
        } catch {
          /* ignore */
        }
        deferredRef.current = null
        setVisible(false)
      }

      window.addEventListener('beforeinstallprompt', onBefore)
      window.addEventListener('appinstalled', onInstalled)
      return () => {
        window.removeEventListener('beforeinstallprompt', onBefore)
        window.removeEventListener('appinstalled', onInstalled)
      }
    } catch {
      return undefined
    }
  }, [])

  const handleInstall = async () => {
    const ev = deferredRef.current
    if (!ev) return
    try {
      await ev.prompt()
      const { outcome } = await ev.userChoice
      if (outcome === 'accepted') {
        try {
          localStorage.setItem(STORAGE_INSTALLED, '1')
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    } finally {
      deferredRef.current = null
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="تثبيت التطبيق"
      className="fixed inset-x-4 bottom-4 z-[100] max-w-md animate-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:start-4"
    >
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
        <p className="text-sm font-medium text-foreground">📲 ثبّت التطبيق على جهازك</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" className="flex-1" onClick={() => void handleInstall()}>
            تثبيت
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              deferredRef.current = null
              setVisible(false)
            }}
          >
            لاحقاً
          </Button>
        </div>
      </div>
    </div>
  )
}
