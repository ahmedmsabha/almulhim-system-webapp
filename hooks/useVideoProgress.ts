"use client"

import { useCallback, useEffect, useState } from "react"

const storageKey = (lessonId: string) => `video-progress:${lessonId}`

export interface PersistedVideoProgress {
  progress: number
  lastPosition: number
  completed: boolean
}

function readStored(lessonId: string): PersistedVideoProgress | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(storageKey(lessonId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedVideoProgress
    if (typeof parsed.progress !== "number") return null
    return {
      progress: parsed.progress,
      lastPosition: typeof parsed.lastPosition === "number" ? parsed.lastPosition : 0,
      completed: Boolean(parsed.completed),
    }
  } catch {
    return null
  }
}

export function useVideoProgress(
  lessonId: string,
  initial?: Partial<PersistedVideoProgress>
) {
  const [progress, setProgress] = useState(() => {
    const stored = readStored(lessonId)
    return (
      stored?.progress ??
      initial?.progress ??
      0
    )
  })
  const [lastPosition, setLastPosition] = useState(
    () => readStored(lessonId)?.lastPosition ?? initial?.lastPosition ?? 0
  )
  const [completed, setCompleted] = useState(
    () => readStored(lessonId)?.completed ?? initial?.completed ?? false
  )

  useEffect(() => {
    const stored = readStored(lessonId)
    if (stored) {
      setProgress(stored.progress)
      setLastPosition(stored.lastPosition)
      setCompleted(stored.completed)
    }
  }, [lessonId])

  const persist = useCallback(
    (next: PersistedVideoProgress) => {
      if (typeof window === "undefined") return
      localStorage.setItem(storageKey(lessonId), JSON.stringify(next))
    },
    [lessonId]
  )

  const updateProgress = useCallback(
    (nextProgress: number, positionSeconds: number, markCompleted?: boolean) => {
      const clamped = Math.min(100, Math.max(0, Math.round(nextProgress)))
      const done =
        markCompleted !== undefined ? markCompleted : clamped >= 95 || completed

      setProgress(clamped)
      setLastPosition(positionSeconds)
      setCompleted(done)
      persist({
        progress: clamped,
        lastPosition: positionSeconds,
        completed: done,
      })
    },
    [completed, persist]
  )

  const isCompleted = completed || progress >= 95

  return {
    progress,
    lastPosition,
    updateProgress,
    isCompleted,
  }
}
