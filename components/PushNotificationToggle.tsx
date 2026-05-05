"use client"

import { Bell, BellOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePushNotifications } from "@/hooks/usePushNotifications"

export function PushNotificationToggle() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications()

  if (!isSupported) {
    return null
  }

  if (permission === "denied") {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        الإشعارات محظورة من إعدادات المتصفح
      </p>
    )
  }

  if (!isSubscribed) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 sm:w-auto"
        disabled={isLoading}
        onClick={() => void subscribe()}
      >
        {isLoading ?
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        : <Bell className="size-4 shrink-0" aria-hidden />}
        تفعيل الإشعارات
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 sm:w-auto"
      disabled={isLoading}
      onClick={() => void unsubscribe()}
    >
      {isLoading ?
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      : <BellOff className="size-4 shrink-0" aria-hidden />}
      إيقاف الإشعارات
    </Button>
  )
}
