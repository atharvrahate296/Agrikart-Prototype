/**
 * Custom Error Classes
 * Used throughout the application for consistent error handling
 */

export enum ErrorCode {
  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_EMAIL = 'INVALID_EMAIL',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  PHONE_NOT_VERIFIED = 'PHONE_NOT_VERIFIED',

  // Token errors
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',

  // Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_LOGIN_ATTEMPTS = 'TOO_MANY_LOGIN_ATTEMPTS',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUERY_FAILED = 'QUERY_FAILED',

  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, any>

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details

    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
        ...(this.details && { details: this.details }),
      },
    }
  }
}

/**
 * Authentication Error (401)
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    details?: Record<string, any>
  ) {
    super(message, code, 401, details)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization Error (403)
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    code: ErrorCode = ErrorCode.FORBIDDEN,
    details?: Record<string, any>
  ) {
    super(message, code, 403, details)
    this.name = 'AuthorizationError'
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    code: ErrorCode = ErrorCode.VALIDATION_ERROR,
    details?: Record<string, any>
  ) {
    super(message, code, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    details?: Record<string, any>
  ) {
    super(message, ErrorCode.ACCOUNT_NOT_FOUND, 404, details)
    this.name = 'NotFoundError'
  }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(
    message: string = 'Too many requests',
    code: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED,
    retryAfter: number = 60,
    details?: Record<string, any>
  ) {
    super(message, code, 429, details)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    }
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    details?: Record<string, any>
  ) {
    super(message, ErrorCode.EMAIL_ALREADY_EXISTS, 409, details)
    this.name = 'ConflictError'
  }
}

/**
 * Database Error (500)
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    details?: Record<string, any>
  ) {
    super(message, ErrorCode.DATABASE_ERROR, 500, details)
    this.name = 'DatabaseError'
  }
}

/**
 * External Service Error (503)
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string = 'External service unavailable',
    details?: Record<string, any>
  ) {
    super(message, ErrorCode.EXTERNAL_SERVICE_ERROR, 503, details)
    this.name = 'ExternalServiceError'
  }
}

/**
 * Check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Convert any error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorCode.INTERNAL_SERVER_ERROR,
      500,
      { originalError: error.name }
    )
  }

  return new AppError(
    String(error),
    ErrorCode.INTERNAL_SERVER_ERROR,
    500
  )
}
