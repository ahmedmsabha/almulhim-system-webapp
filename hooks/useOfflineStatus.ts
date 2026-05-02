"use client"

import { useCallback, useEffect, useState } from "react"

export type ConnectionType = string | null

export interface OfflineStatusState {
  isOnline: boolean
  isWeak: boolean
  connectionType: ConnectionType
}

function readConnectionType(): ConnectionType {
  if (typeof navigator === "undefined") return null
  const c = (navigator as Navigator & { connection?: NetworkInformation }).connection
  return c?.effectiveType ?? c?.type ?? null
}

interface NetworkInformation extends EventTarget {
  effectiveType?: string
  type?: string
}

function computeState(): OfflineStatusState {
  if (typeof navigator === "undefined") {
    return { isOnline: true, isWeak: false, connectionType: null }
  }
  const online = navigator.onLine
  const connectionType = readConnectionType()
  const weak =
    online &&
    (connectionType === "slow-2g" ||
      connectionType === "2g" ||
      connectionType === "1g")
  return {
    isOnline: online,
    isWeak: Boolean(weak),
    connectionType,
  }
}

/** Maps navigator.onLine + Network Information API to connection buckets. */
export function useOfflineStatus(): OfflineStatusState {
  const [state, setState] = useState<OfflineStatusState>(computeState)

  const update = useCallback(() => {
    setState(computeState())
  }, [])

  useEffect(() => {
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)

    const connection = (navigator as Navigator & { connection?: EventTarget }).connection
    connection?.addEventListener("change", update)

    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
      connection?.removeEventListener("change", update)
    }
  }, [update])

  return state
}
