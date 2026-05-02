"use client"

import { useMemo } from "react"
import { differenceInCalendarDays, parseISO } from "date-fns"

import { EXPIRING_SOON_THRESHOLD_DAYS, SUBSCRIPTION_STATUS } from "@/lib/constants"
import type { Subscription } from "@/types"

export interface SubscriptionStatusState {
  isActive: boolean
  isExpiringSoon: boolean
  daysRemaining: number | null
  plan: string | null
}

function safeParseEndDate(subscription: Subscription | null | undefined): Date | null {
  if (!subscription?.end_date) return null
  try {
    return parseISO(subscription.end_date)
  } catch {
    return null
  }
}

/** Client-side subscription summary from the latest subscription payload (e.g. from the server or sample data). */
export function useSubscriptionStatus(
  subscription: Subscription | null | undefined
): SubscriptionStatusState {
  return useMemo(() => {
    if (!subscription) {
      return {
        isActive: false,
        isExpiringSoon: false,
        daysRemaining: null,
        plan: null,
      }
    }

    const end = safeParseEndDate(subscription)
    const now = new Date()
    const daysRemaining =
      end != null ? differenceInCalendarDays(end, now) : null

    const status = subscription.status
    const isActive =
      status === SUBSCRIPTION_STATUS.active ||
      status === SUBSCRIPTION_STATUS.expiring_soon

    const isExpiringSoon =
      isActive &&
      daysRemaining != null &&
      daysRemaining >= 0 &&
      daysRemaining <= EXPIRING_SOON_THRESHOLD_DAYS

    return {
      isActive,
      isExpiringSoon,
      daysRemaining,
      plan: subscription.plan_name ?? null,
    }
  }, [subscription])
}
