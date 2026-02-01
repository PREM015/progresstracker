// src/lib/apiResponse.ts
/**
 * Standardized API Response utilities
 * Consistent response format across all API routes
 */

import { NextResponse } from 'next/server';
import { ApiError, isApiError, toApiError } from './apiError';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown[];
  };
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// =============================================================================
// SUCCESS RESPONSES
// =============================================================================

/**
 * Create success response
 */
export function success<T>(
  data: T,
  options: {
    status?: number;
    meta?: ResponseMeta;
    headers?: Record<string, string>;
  } = {}
): NextResponse<ApiSuccessResponse<T>> {
  const { status = 200, meta, headers = {} } = options;

  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create success response with pagination
 */
export function paginated<T>(
  data: T[],
  pagination: PaginationMeta,
  options: {
    meta?: Omit<ResponseMeta, 'pagination'>;
    headers?: Record<string, string>;
  } = {}
): NextResponse<ApiSuccessResponse<T[]>> {
  return success(data, {
    meta: {
      ...options.meta,
      pagination,
    },
    headers: options.headers,
  });
}

/**
 * Create 201 Created response
 */
export function created<T>(
  data: T,
  meta?: ResponseMeta
): NextResponse<ApiSuccessResponse<T>> {
  return success(data, { status: 201, meta });
}

/**
 * Create 204 No Content response
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

/**
 * Create error response
 */
export function error(
  err: ApiError | Error | unknown,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const apiError = isApiError(err) ? err : toApiError(err, requestId);

  // Log the error
  logger.error(apiError.message, {
    code: apiError.code,
    statusCode: apiError.statusCode,
    requestId,
  }, err);

  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: apiError.message,
      code: apiError.code,
      details: apiError.details,
    },
    meta: {
      requestId: apiError.requestId || requestId,
      timestamp: apiError.timestamp,
    },
  };

  return NextResponse.json(response, {
    status: apiError.statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create validation error response
 */
export function validationError(
  message: string,
  details?: unknown[],
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code: 'VALIDATION_ERROR',
      details,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: 400 });
}

/**
 * Create unauthorized error response
 */
export function unauthorized(
  message: string = 'Unauthorized',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code: 'UNAUTHORIZED',
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: 401 });
}

/**
 * Create forbidden error response
 */
export function forbidden(
  message: string = 'Forbidden',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code: 'FORBIDDEN',
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: 403 });
}

/**
 * Create not found error response
 */
export function notFound(
  resource: string = 'Resource',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: `${resource} not found`,
      code: 'NOT_FOUND',
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: 404 });
}

/**
 * Create rate limit error response
 */
export function rateLimited(
  retryAfter: number = 60,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, {
    status: 429,
    headers: {
      'Retry-After': String(retryAfter),
    },
  });
}

/**
 * Create internal server error response
 */
export function internalError(
  message: string = 'Internal server error',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code: 'INTERNAL_ERROR',
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: 500 });
}

// =============================================================================
// HANDLER WRAPPER
// =============================================================================

/**
 * Wrap API handler with error handling
 */
export function withErrorHandler<T>(
  handler: (req: Request) => Promise<NextResponse<T>>
): (req: Request) => Promise<NextResponse<T | ApiErrorResponse>> {
  return async (req: Request) => {
    const requestId = crypto.randomUUID();

    try {
      const response = await handler(req);
      response.headers.set('X-Request-ID', requestId);
      return response;
    } catch (err) {
      return error(err, requestId);
    }
  };
}

// =============================================================================
// EXPORT DEFAULT OBJECT
// =============================================================================

const apiResponse = {
  success,
  paginated,
  created,
  noContent,
  error,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  internalError,
  withErrorHandler,
};
export default apiResponse;