"use client"

import { useOfflineStatus } from "@/hooks/useOfflineStatus"
import { usePwaInstall } from "@/hooks/usePwaInstall"

/** @deprecated Prefer `usePwaInstall` — kept for incremental migration. */
export function usePWA() {
  const { canInstall, install, isInstalled } = usePwaInstall()
  return {
    isInstallable: canInstall,
    install,
    isInstalled,
  }
}

export function useOnlineStatus() {
  return useOfflineStatus().isOnline
}
