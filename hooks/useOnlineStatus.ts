'use client'

import { useCallback, useEffect, useState } from 'react'

function readNavigatorOnline(): boolean {
  try {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  } catch {
    return true
  }
}

export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(readNavigatorOnline)

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
