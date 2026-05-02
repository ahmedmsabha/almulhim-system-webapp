'use client'

import { useEffect, useState } from 'react'
import { getOfflinePlaylistManifest } from '@/lib/offline/offline-manifest-idb'

export function useOfflineLessonManifest(videoId: string): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const record = await getOfflinePlaylistManifest(videoId)
        if (!cancelled) setAvailable(record !== null)
      } catch {
        if (!cancelled) setAvailable(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [videoId])

  return available
}
