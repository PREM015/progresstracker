import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

export interface ApiError {
  error: string;
  code: string;
  status: number;
  timestamp: string;
  requestId?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  status: number;
}

/**
 * Standardized error response
 */
export function errorResponse(
  status: number,
  message: string,
  code: string = 'UNKNOWN_ERROR',
  requestId?: string
): NextResponse<ApiError> {
  const error: ApiError = {
    error: message,
    code,
    status,
    timestamp: new Date().toISOString(),
    requestId,
  };

  logger.error(`API Error [${code}]`, { status, message, requestId });

  return NextResponse.json(error, { status });
}

/**
 * Standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status });
}

/**
 * API handler wrapper with error handling
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      logger.debug('API Request', {
        method: req.method,
        path: req.nextUrl.pathname,
        requestId,
      });

      const response = await handler(req);
      const duration = Date.now() - startTime;

      logger.debug('API Response', {
        status: response.status,
        duration: `${duration}ms`,
        requestId,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('API Handler Error', error as Error);

      if (error instanceof Error) {
        if (error.message.includes('Validation')) {
          return errorResponse(400, error.message, 'VALIDATION_ERROR', requestId);
        }
        if (error.message.includes('Unauthorized')) {
          return errorResponse(401, error.message, 'UNAUTHORIZED', requestId);
        }
        if (error.message.includes('Not found')) {
          return errorResponse(404, error.message, 'NOT_FOUND', requestId);
        }
        if (error.message.includes('Rate limit')) {
          return errorResponse(429, error.message, 'RATE_LIMIT_EXCEEDED', requestId);
        }
      }

      return errorResponse(
        500,
        'Internal server error',
        'INTERNAL_SERVER_ERROR',
        requestId
      );
    }
  };
}

/**
 * Validation error helper
 */
export function validationError(message: string): NextResponse<ApiError> {
  return errorResponse(400, message, 'VALIDATION_ERROR');
}

/**
 * Unauthorized error helper
 */
export function unauthorizedError(message: string = 'Unauthorized'): NextResponse<ApiError> {
  return errorResponse(401, message, 'UNAUTHORIZED');
}

/**
 * Not found error helper
 */
export function notFoundError(message: string = 'Resource not found'): NextResponse<ApiError> {
  return errorResponse(404, message, 'NOT_FOUND');
}

/**
 * Rate limit error helper
 */
export function rateLimitError(): NextResponse<ApiError> {
  return errorResponse(
    429,
    'Too many requests. Please try again later.',
    'RATE_LIMIT_EXCEEDED'
  );
}
