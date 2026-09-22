export class AuthError extends Error {
  constructor(message = "unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class PayloadTooLargeError extends Error {
  constructor(message = "payload_too_large") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

export class RateLimitError extends Error {
  retryAfterSec: number;
  constructor(retryAfterSec: number) {
    super("too_many_requests");
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

export class ConflictError extends Error {
  constructor(message = "conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(entity = "resource") {
    super(`${entity} not found`);
    this.name = "NotFoundError";
  }
}
