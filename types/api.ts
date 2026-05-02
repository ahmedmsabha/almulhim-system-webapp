/** Discriminated union for server action results — never expose raw DB errors. */

export type ActionSuccess<T> = { success: true; data: T }

export type ActionFailure = {
  success: false
  error: string
  code: ActionErrorCode
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure

export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SUBSCRIPTION_EXPIRED"
  | "DATABASE_ERROR"
  | "VALIDATION_ERROR"
  | "UNKNOWN"
