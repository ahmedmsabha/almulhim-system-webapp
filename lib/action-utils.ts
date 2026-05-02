import "server-only"

import {
  AccessDeniedError,
  DatabaseError,
  ResourceNotFoundError,
  SubscriptionExpiredError,
  UnauthorizedError,
} from "@/lib/db/errors"
import type { ActionErrorCode, ActionFailure, ActionResult } from "@/types/api"

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

export function actionFailure(error: string, code: ActionErrorCode): ActionFailure {
  return { success: false, error, code }
}

export function mapCaughtErrorToAction(e: unknown): ActionFailure {
  if (e instanceof UnauthorizedError) {
    return actionFailure(e.message || "Unauthorized", "UNAUTHORIZED")
  }
  if (e instanceof AccessDeniedError) {
    return actionFailure(e.message || "Access denied", "FORBIDDEN")
  }
  if (e instanceof ResourceNotFoundError) {
    return actionFailure(e.message || "Not found", "NOT_FOUND")
  }
  if (e instanceof SubscriptionExpiredError) {
    return actionFailure(e.message || "Subscription is not active", "SUBSCRIPTION_EXPIRED")
  }
  if (e instanceof DatabaseError) {
    return actionFailure("Unable to complete the request", "DATABASE_ERROR")
  }
  if (e instanceof Error && e.message.trim()) {
    return actionFailure(e.message.trim(), "UNKNOWN")
  }
  return actionFailure("Something went wrong", "UNKNOWN")
}
