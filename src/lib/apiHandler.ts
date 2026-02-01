// src/lib/apiHandler.ts
/**
 * API Handler utilities with standardized error handling
 * Updated to work with logger correctly
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { ApiError, toApiError, ErrorCodes } from './apiError';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiErrorResponse {
  error: string;
  code: string;
  status: number;
  timestamp: string;
  requestId?: string;
  details?: unknown[];
}

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta?: {
    requestId?: string;
    [key: string]: unknown;
  };
}
/**
 * Convert unknown error to standardized API response
 * (Reusable in routes / middleware / services)
 */
export function handleApiError(
  error: unknown,
  requestId?: string,
  context?: {
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
  }
): NextResponse<ApiErrorResponse> {
  // ✅ ApiError ko properly use kiya
  const apiError: ApiError = toApiError(error, requestId);

  // log structured
  logger.error(`API Error [${apiError.code}]`, {
    requestId,
    statusCode: apiError.statusCode,
    message: apiError.message,
    details: apiError.details,
    ...context,
  });

  return errorResponse(
    apiError.statusCode,
    apiError.message,
    apiError.code,
    requestId,
    apiError.details
  );
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Standardized error response
 */
export function errorResponse(
  status: number,
  message: string,
  code: string = ErrorCodes.INTERNAL_ERROR,
  requestId?: string,
  details?: unknown[]
): NextResponse<ApiErrorResponse> {
  const error: ApiErrorResponse = {
    error: message,
    code,
    status,
    timestamp: new Date().toISOString(),
    requestId,
    details,
  };

  logger.error(`API Error [${code}]`, { 
    status, 
    message, 
    requestId,
    details,
  });

  return NextResponse.json(error, { status });
}

/**
 * Standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    data,
    meta: requestId ? { requestId } : undefined,
  };

  return NextResponse.json(response, { status });
}

// =============================================================================
// ERROR HANDLER WRAPPER
// =============================================================================

/**
 * API handler wrapper with comprehensive error handling
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const startTime = Date.now();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    logger.debug('API Request', {
      method: req.method,
      path: req.nextUrl.pathname,
      requestId,
      ip,
      userAgent,
    });

    try {
      logger.debug('API Request', {
        method: req.method,
        path: req.nextUrl.pathname,
        requestId,
      });

      const response = await handler(req);
      const duration = Date.now() - startTime;

      logger.api(
        req.method,
        req.nextUrl.pathname,
        response.status,
        duration,
        { requestId }
      );

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const apiError = toApiError(error, requestId);

      logger.api(
        req.method,
        req.nextUrl.pathname,
        apiError.statusCode,
        duration,
        { 
          requestId,
          error: apiError.message,
          code: apiError.code,
        }
      );

      return errorResponse(
        apiError.statusCode,
        apiError.message,
        apiError.code,
        requestId,
        apiError.details
      );
    }
  };
}

// =============================================================================
// CONVENIENCE ERROR HELPERS
// =============================================================================

/**
 * Validation error helper
 */
export function validationError(
  message: string,
  details?: unknown[]
): NextResponse<ApiErrorResponse> {
  return errorResponse(400, message, ErrorCodes.VALIDATION_ERROR, undefined, details);
}

/**
 * Unauthorized error helper
 */
export function unauthorizedError(
  message: string = 'Unauthorized'
): NextResponse<ApiErrorResponse> {
  return errorResponse(401, message, ErrorCodes.UNAUTHORIZED);
}

/**
 * Forbidden error helper
 */
export function forbiddenError(
  message: string = 'Forbidden'
): NextResponse<ApiErrorResponse> {
  return errorResponse(403, message, ErrorCodes.FORBIDDEN);
}

/**
 * Not found error helper
 */
export function notFoundError(
  message: string = 'Resource not found'
): NextResponse<ApiErrorResponse> {
  return errorResponse(404, message, ErrorCodes.NOT_FOUND);
}

/**
 * Conflict error helper
 */
export function conflictError(
  message: string = 'Resource already exists'
): NextResponse<ApiErrorResponse> {
  return errorResponse(409, message, ErrorCodes.CONFLICT);
}

/**
 * Rate limit error helper
 */
export function rateLimitError(): NextResponse<ApiErrorResponse> {
  return errorResponse(
    429,
    'Too many requests. Please try again later.',
    ErrorCodes.RATE_LIMIT_EXCEEDED
  );
}

/**
 * Internal server error helper
 */
export function internalError(
  message: string = 'Internal server error'
): NextResponse<ApiErrorResponse> {
  return errorResponse(500, message, ErrorCodes.INTERNAL_ERROR);
}

// =============================================================================
// EXPORTS
// =============================================================================

const apiHandler= {
  errorResponse,
  successResponse,
  withErrorHandling,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  rateLimitError,
  internalError,
};
export default apiHandler;