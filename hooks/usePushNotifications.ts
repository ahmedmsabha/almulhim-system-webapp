"use client"

import { useCallback, useEffect, useState } from "react"

import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/actions/push-notifications"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const bytes = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i)
  }
  return bytes
}

export type UsePushNotificationsResult = {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    setIsSupported("PushManager" in window && "Notification" in window)
    setPermission(Notification.permission)

    let cancelled = false

    ;(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled) {
          setIsSubscribed(Boolean(sub))
        }
      } catch {
        /* ignore */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (typeof window === "undefined") return
    if (!("Notification" in window) || !("PushManager" in window)) return

    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
    if (!vapid) {
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set")
      return
    }

    setIsLoading(true)
    try {
      const nextPermission = await Notification.requestPermission()
      setPermission(nextPermission)
      if (nextPermission !== "granted") {
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      })

      const json = sub.toJSON()
      const endpoint = json.endpoint
      const keyB64 = json.keys?.p256dh
      const authB64 = json.keys?.auth
      if (!endpoint || !keyB64 || !authB64) {
        return
      }

      const result = await savePushSubscriptionAction({
        endpoint,
        p256dh: keyB64,
        auth: authB64,
      })
      if (result.success) {
        setIsSubscribed(true)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    if (typeof window === "undefined" || !("PushManager" in window)) return

    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const endpoint = sub?.endpoint

      if (sub) {
        await sub.unsubscribe()
      }

      if (endpoint) {
        await deletePushSubscriptionAction(endpoint)
      }
      setIsSubscribed(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  }
}
