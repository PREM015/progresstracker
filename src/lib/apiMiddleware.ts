// src/lib/apiMiddleware.ts
/**
 * API Middleware utilities
 * Authentication, rate limiting, and request processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { logger } from './logger';
import { ApiError, UnauthorizedError, ForbiddenError, RateLimitError } from './apiError';
import { rateLimiters, checkRateLimit } from './rateLimiter';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  isAdmin: boolean;
}

export interface RequestContext {
  user?: AuthenticatedUser;
  requestId: string;
  startTime: number;
  ip: string;
  userAgent: string;
}

export type AuthenticatedRequest = NextRequest & {
  context: RequestContext & { user: AuthenticatedUser };
};

export type ApiHandler<T = unknown> = (
  req: NextRequest,
  context: RequestContext
) => Promise<NextResponse<T>>;

export type AuthenticatedApiHandler<T = unknown> = (
  req: NextRequest,
  context: RequestContext & { user: AuthenticatedUser }
) => Promise<NextResponse<T>>;

// =============================================================================
// REQUEST CONTEXT
// =============================================================================

/**
 * Create request context from NextRequest
 */
export function createRequestContext(req: NextRequest): RequestContext {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  return {
    requestId,
    startTime: Date.now(),
    ip,
    userAgent,
  };
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Authenticate request and return user
 */
export async function authenticate(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.id) {
      return null;
    }

    return {
      id: token.id as string,
      email: token.email as string,
      role: (token.role as Role) || 'user',
      isAdmin: token.isAdmin as boolean || false,
    };
  } catch (error) {
    logger.error('Authentication error', {}, error);
    return null;
  }
}

/**
 * Require authentication middleware wrapper
 */
export function requireAuth<T>(
  handler: AuthenticatedApiHandler<T>
): ApiHandler<T> {
  return async (req: NextRequest, context: RequestContext) => {
    const user = await authenticate(req);

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user is active
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isActive: true, isBanned: true },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    if (dbUser.isBanned) {
      throw new ForbiddenError('Account is banned');
    }

    return handler(req, { ...context, user });
  };
}

/**
 * Require admin role middleware wrapper
 */
export function requireAdmin<T>(
  handler: AuthenticatedApiHandler<T>
): ApiHandler<T> {
  return requireAuth(async (req, context) => {
    if (!context.user.isAdmin && context.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    return handler(req, context);
  });
}

// =============================================================================
// RATE LIMITING MIDDLEWARE
// =============================================================================

export interface RateLimitOptions {
  maxRequests?: number;
  windowSeconds?: number;
  keyGenerator?: (req: NextRequest, context: RequestContext) => string;
}

/**
 * Rate limiting middleware wrapper
 */
export function rateLimit<T>(
  handler: ApiHandler<T>,
  options: RateLimitOptions = {}
): ApiHandler<T> {
  const {
    keyGenerator = (req, ctx) => ctx.user?.id || ctx.ip,
  } = options;

  return async (req: NextRequest, context: RequestContext) => {
    const key = keyGenerator(req, context);
    const result = await checkRateLimit(key, rateLimiters.api);

    if (!result.allowed) {
      throw new RateLimitError(60);
    }

    const response = await handler(req, context);

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(result.remaining + 1));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));

    return response;
  };
}

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

import { z, ZodSchema } from 'zod';
import { ValidationError } from './apiError';

/**
 * Validate request body against schema
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      throw new ValidationError('Validation failed', details);
    }
    throw new ValidationError('Invalid request body');
  }
}

/**
 * Validate query parameters against schema
 */
export function validateQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      throw new ValidationError('Invalid query parameters', details);
    }
    throw new ValidationError('Invalid query parameters');
  }
}

// =============================================================================
// LOGGING MIDDLEWARE
// =============================================================================

/**
 * Log API request/response
 */
export function withLogging<T>(handler: ApiHandler<T>): ApiHandler<T> {
  return async (req: NextRequest, context: RequestContext) => {
    const { method } = req;
    const path = req.nextUrl.pathname;

    logger.debug('API Request', {
      method,
      path,
      requestId: context.requestId,
      userId: context.user?.id,
      ip: context.ip,
    });

    try {
      const response = await handler(req, context);
      const duration = Date.now() - context.startTime;

      logger.api(method, path, response.status, duration, {
        requestId: context.requestId,
        userId: context.user?.id,
      });

      // Add request ID to response
      response.headers.set('X-Request-ID', context.requestId);

      return response;
    } catch (error) {
      const duration = Date.now() - context.startTime;
      const statusCode = error instanceof ApiError ? error.statusCode : 500;

      logger.api(method, path, statusCode, duration, {
        requestId: context.requestId,
        userId: context.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  };
}

// =============================================================================
// CORS MIDDLEWARE
// =============================================================================

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
].filter(Boolean);

/**
 * Add CORS headers to response
 */
export function withCors<T>(handler: ApiHandler<T>): ApiHandler<T> {
  return async (req: NextRequest, context: RequestContext) => {
    const origin = req.headers.get('origin');
    const response = await handler(req, context);

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
    }

    return response;
  };
}

// =============================================================================
// COMPOSE MIDDLEWARE
// =============================================================================

type Middleware<T> = (handler: ApiHandler<T>) => ApiHandler<T>;

/**
 * Compose multiple middleware functions
 */
export function compose<T>(...middlewares: Middleware<T>[]): Middleware<T> {
  return (handler: ApiHandler<T>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * Create API handler with common middleware
 */
export function createApiHandler<T>(
  handler: ApiHandler<T>,
  options: {
    auth?: boolean;
    admin?: boolean;
    rateLimit?: boolean | RateLimitOptions;
  } = {}
): ApiHandler<T> {
  let wrappedHandler = handler;

  // Apply rate limiting
  if (options.rateLimit) {
    const rateLimitOptions = typeof options.rateLimit === 'object' ? options.rateLimit : {};
    wrappedHandler = rateLimit(wrappedHandler, rateLimitOptions);
  }

  // Apply authentication
  if (options.admin) {
    wrappedHandler = requireAdmin(wrappedHandler as AuthenticatedApiHandler<T>);
  } else if (options.auth) {
    wrappedHandler = requireAuth(wrappedHandler as AuthenticatedApiHandler<T>);
  }

  // Apply logging
  wrappedHandler = withLogging(wrappedHandler);

  // Apply CORS
  wrappedHandler = withCors(wrappedHandler);

  return wrappedHandler;
}

const apiMiddleware = {
  createRequestContext,
  authenticate,
  requireAuth,
  requireAdmin,
  rateLimit,
  validateBody,
  validateQuery,
  withLogging,
  withCors,
  compose,
  createApiHandler,
};
export default apiMiddleware;