// src/lib/server/api-helpers.ts
// Server-side API route utility functions

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiError;

// =============================================================================
// RESPONSE BUILDERS
// =============================================================================

/**
 * Return a 200 OK response with data.
 */
export function ok<T>(data: T, message?: string, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ data, message, meta }, { status: 200 });
}

/**
 * Return a 201 Created response.
 */
export function created<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({ data, message }, { status: 201 });
}

/**
 * Return a 204 No Content response.
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Return an error response.
 */
export function errorResponse(
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: unknown
): NextResponse {
  return NextResponse.json({ error: message, code, details }, { status: statusCode });
}

// =============================================================================
// REQUEST PARSERS
// =============================================================================

/**
 * Parse and validate request body using a Zod schema.
 * Throws on validation failure (caught by handleApiError).
 */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Error('Invalid JSON body');
  }
  return schema.parse(body);
}

/**
 * Parse and validate URL search params using a Zod schema.
 */
export function parseQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): T {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return schema.parse(params);
}

/**
 * Parse route params object using a Zod schema.
 */
export function parseParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>
): T {
  return schema.parse(params);
}

// =============================================================================
// HANDLER WRAPPER
// =============================================================================

/**
 * Wrap a Next.js API handler with error handling.
 * Automatically catches ZodErrors, AppErrors, and generic errors.
 */
export function createApiHandler<T>(
  handler: (req: NextRequest, context: { params: Record<string, string> }) => Promise<NextResponse | T>
) {
  return async (
    req: NextRequest,
    context: { params: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      const result = await handler(req, context);
      if (result instanceof NextResponse) return result;
      return ok(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', error.flatten().fieldErrors);
      }

      const appError = error as { statusCode?: number; message?: string; code?: string; details?: unknown };
      if (appError.statusCode) {
        return errorResponse(
          appError.message ?? 'An error occurred',
          appError.statusCode,
          appError.code,
          appError.details
        );
      }

      console.error('[API Error]', error);
      return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
    }
  };
}

// =============================================================================
// COMMON RESPONSE MESSAGES
// =============================================================================

export const API_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'You must be logged in',
  FORBIDDEN: 'You do not have permission',
  VALIDATION_ERROR: 'Validation failed',
  SERVER_ERROR: 'An unexpected error occurred',
} as const;
