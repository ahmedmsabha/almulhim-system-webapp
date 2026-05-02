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

/**
 * Stable snapshot for SSR + first client paint only — avoids hydration mismatches:
 * some runtimes expose `navigator.onLine === false` during SSR while the browser reports online.
 */
const HYDRATION_SAFE_STATE: OfflineStatusState = {
  isOnline: true,
  isWeak: false,
  connectionType: null,
}

/** Maps navigator.onLine + Network Information API to connection buckets. */
export function useOfflineStatus(): OfflineStatusState {
  const [state, setState] = useState<OfflineStatusState>(() => HYDRATION_SAFE_STATE)

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
