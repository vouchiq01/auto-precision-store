import type { ApiProblem } from '@aps/shared';

/**
 * Typed domain errors, mapped to HTTP in exactly one place (the error handler).
 * Route code throws meaning; it never assembles a status code by hand.
 */
export class AppError extends Error {
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly errors?: Record<string, string[]>;
  /** Unexpected errors are logged at error level; expected ones at warn. */
  readonly expected: boolean;

  constructor(params: {
    status: number; type: string; title: string; detail?: string;
    errors?: Record<string, string[]>; expected?: boolean;
  }) {
    super(params.detail ?? params.title);
    this.name = 'AppError';
    this.status = params.status;
    this.type = params.type;
    this.title = params.title;
    this.errors = params.errors;
    this.expected = params.expected ?? true;
  }

  toProblem(requestId?: string): ApiProblem {
    return {
      type: this.type, title: this.title, status: this.status,
      detail: this.message, errors: this.errors, requestId,
    };
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>, detail = 'Some fields need attention.') {
    super({ status: 422, type: 'validation_error', title: 'Validation failed', detail, errors });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(what = 'Resource') {
    super({ status: 404, type: 'not_found', title: 'Not found', detail: `${what} was not found.` });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(detail = 'You need to sign in to do that.') {
    super({ status: 401, type: 'unauthorized', title: 'Not signed in', detail });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(detail = 'You do not have permission to do that.') {
    super({ status: 403, type: 'forbidden', title: 'Forbidden', detail });
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(detail: string) {
    super({ status: 409, type: 'conflict', title: 'Conflict', detail });
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, detail = 'Too many attempts. Please wait a moment.') {
    super({ status: 429, type: 'rate_limited', title: 'Too many requests', detail });
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class OutOfStockError extends AppError {
  constructor(productName: string, available: number) {
    super({
      status: 409, type: 'out_of_stock', title: 'Not enough stock',
      detail: available === 0
        ? `${productName} is out of stock.`
        : `Only ${available} left of ${productName}.`,
    });
    this.name = 'OutOfStockError';
  }
}

export class CouponError extends AppError {
  constructor(detail: string) {
    super({ status: 422, type: 'coupon_invalid', title: 'Coupon cannot be applied', detail });
    this.name = 'CouponError';
  }
}

export class PaymentVerificationError extends AppError {
  constructor(detail = 'We could not verify this payment.') {
    /* Deliberately opaque to the client and logged loudly: a signature mismatch
       is either a bug or an attempt to forge a payment, and both need eyes. */
    super({ status: 400, type: 'payment_verification_failed', title: 'Payment verification failed', detail, expected: false });
    this.name = 'PaymentVerificationError';
  }
}

export class PaymentConfigError extends AppError {
  constructor() {
    super({
      status: 503, type: 'payment_unavailable', title: 'Payments unavailable',
      detail: 'Online payment is not configured on this server yet.',
    });
    this.name = 'PaymentConfigError';
  }
}

export class NotServiceableError extends AppError {
  constructor(pincode: string) {
    super({
      status: 422, type: 'not_serviceable', title: 'Not deliverable',
      detail: `We do not deliver to ${pincode} yet. Please contact us and we will try to arrange freight.`,
    });
    this.name = 'NotServiceableError';
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super({
      status: 422, type: 'invalid_transition', title: 'Invalid status change',
      detail: `An order cannot go from "${from}" to "${to}".`,
    });
    this.name = 'InvalidTransitionError';
  }
}
