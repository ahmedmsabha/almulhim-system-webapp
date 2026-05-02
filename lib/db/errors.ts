export class DatabaseError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "DatabaseError"
  }
}

export class SubscriptionExpiredError extends DatabaseError {
  constructor(message = "Subscription is not active") {
    super(message)
    this.name = "SubscriptionExpiredError"
  }
}

export class ResourceNotFoundError extends DatabaseError {
  constructor(message = "Resource not found") {
    super(message)
    this.name = "ResourceNotFoundError"
  }
}

export class UnauthorizedError extends DatabaseError {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class AccessDeniedError extends DatabaseError {
  constructor(message = "Access denied") {
    super(message)
    this.name = "AccessDeniedError"
  }
}
