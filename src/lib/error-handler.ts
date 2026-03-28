// src/lib/error-handler.ts
// Centralized error handling utilities

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', public readonly retryAfter?: number) {
    super(message, 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service is temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

// =============================================================================
// ERROR PARSING
// =============================================================================

export interface FormattedError {
  error: string;
  code?: string;
  details?: unknown;
  statusCode: number;
}

/**
 * Convert any thrown error into a structured error response.
 * Works with ZodError, Prisma errors, AppError, and generic Errors.
 */
export function parseError(error: unknown): FormattedError {
  // ZodError
  if (error instanceof ZodError) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.flatten().fieldErrors,
      statusCode: 400,
    };
  }

  // AppError subclasses
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { error: 'This record already exists', code: 'CONFLICT', statusCode: 409 };
    }
    if (error.code === 'P2025') {
      return { error: 'Record not found', code: 'NOT_FOUND', statusCode: 404 };
    }
    return { error: 'Database operation failed', code: 'DB_ERROR', statusCode: 500 };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return { error: 'Invalid database query', code: 'DB_VALIDATION_ERROR', statusCode: 400 };
  }

  // Generic Error
  if (error instanceof Error) {
    return { error: error.message, statusCode: 500 };
  }

  return { error: 'An unexpected error occurred', statusCode: 500 };
}

// =============================================================================
// API RESPONSE HELPERS
// =============================================================================

/**
 * Convert an error to a NextResponse JSON error response.
 */
export function handleApiError(error: unknown): NextResponse {
  const { error: message, code, details, statusCode } = parseError(error);

  if (statusCode >= 500) {
    console.error('[API Error]', error);
  }

  return NextResponse.json({ error: message, code, details }, { status: statusCode });
}

/**
 * Wrap an async API handler with standardized error handling.
 */
export function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  return handler().catch((error) => handleApiError(error));
}

// =============================================================================
// CLIENT-SIDE HELPERS
// =============================================================================

/**
 * Extract human-readable message from an API response error object.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
  }
  return 'An unexpected error occurred';
}

/**
 * Safely parse fetch response JSON or throw formatted error.
 */
export async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new AppError(
      data.error ?? `Request failed with status ${response.status}`,
      response.status,
      data.code
    );
  }
  return data as T;
}
