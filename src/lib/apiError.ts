// src/lib/apiError.ts
/**
 * API Error handling utilities
 * Standardized error classes for consistent API responses
 */

import { logger } from './logger';

// =============================================================================
// ERROR CODES (Matching your API structure)
// =============================================================================

export const ErrorCodes = {
  // Authentication Errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Authorization Errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  
  // Validation Errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resource Errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PLATFORM_NOT_FOUND: 'PLATFORM_NOT_FOUND',
  GOAL_NOT_FOUND: 'GOAL_NOT_FOUND',
  
  // Conflict Errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Server Errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Sync Errors
  SYNC_FAILED: 'SYNC_FAILED',
  SYNC_IN_PROGRESS: 'SYNC_IN_PROGRESS',
  PLATFORM_UNAVAILABLE: 'PLATFORM_UNAVAILABLE',
  
  // Payment Errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// =============================================================================
// API ERROR CLASS
// =============================================================================

export interface ApiErrorDetails {
  field?: string;
  value?: unknown;
  constraint?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ApiErrorDetails[];
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    details?: ApiErrorDetails[],
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to JSON response
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }

  /**
   * Log the error
   */
  log(context?: Record<string, unknown>) {
    logger.error(this.message, {
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      requestId: this.requestId,
      ...context,
    }, this);
  }
}

// =============================================================================
// SPECIFIC ERROR CLASSES
// =============================================================================

export class ValidationError extends ApiError {
  constructor(message: string, details?: ApiErrorDetails[], requestId?: string) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, details, requestId);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', requestId?: string) {
    super(message, 401, ErrorCodes.UNAUTHORIZED, undefined, requestId);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', requestId?: string) {
    super(message, 403, ErrorCodes.FORBIDDEN, undefined, requestId);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', requestId?: string) {
    super(`${resource} not found`, 404, ErrorCodes.NOT_FOUND, undefined, requestId);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: ApiErrorDetails[], requestId?: string) {
    super(message, 409, ErrorCodes.CONFLICT, details, requestId);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60, requestId?: string) {
    super(
      'Too many requests. Please try again later.',
      429,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      undefined,
      requestId
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = 'Database error', requestId?: string) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, undefined, requestId);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends ApiError {
  public readonly service: string;

  constructor(service: string, message?: string, requestId?: string) {
    super(
      message || `External service error: ${service}`,
      502,
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      undefined,
      requestId
    );
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

// =============================================================================
// ERROR FACTORY FUNCTIONS
// =============================================================================

export function badRequest(message: string, details?: ApiErrorDetails[]): ApiError {
  return new ValidationError(message, details);
}

export function unauthorized(message?: string): ApiError {
  return new UnauthorizedError(message);
}

export function forbidden(message?: string): ApiError {
  return new ForbiddenError(message);
}

export function notFound(resource?: string): ApiError {
  return new NotFoundError(resource);
}

export function conflict(message: string, details?: ApiErrorDetails[]): ApiError {
  return new ConflictError(message, details);
}

export function rateLimited(retryAfter?: number): ApiError {
  return new RateLimitError(retryAfter);
}

export function internal(message?: string): ApiError {
  return new ApiError(message || 'Internal server error', 500, ErrorCodes.INTERNAL_ERROR);
}

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Convert unknown error to ApiError
 */
export function toApiError(error: unknown, requestId?: string): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Check for Prisma errors
    if (error.message.includes('Unique constraint')) {
      return new ConflictError('A record with this value already exists', undefined, requestId);
    }
    if (error.message.includes('Foreign key constraint')) {
      return new ValidationError('Referenced record does not exist', undefined, requestId);
    }
    if (error.message.includes('Record not found')) {
      return new NotFoundError('Record', requestId);
    }

    return new ApiError(error.message, 500, ErrorCodes.INTERNAL_ERROR, undefined, requestId);
  }

  return new ApiError(
    'An unexpected error occurred',
    500,
    ErrorCodes.INTERNAL_ERROR,
    undefined,
    requestId
  );
}

/**
 * Wrap async handler with error handling
 */
export function catchAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args) as ReturnType<T>;
    } catch (error) {
      throw toApiError(error);
    }
  };
}

export default ApiError;