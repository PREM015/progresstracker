/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: middleware/auth.ts
// PURPOSE: General authentication middleware
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. middleware/adminAuth.ts - Admin auth middleware (existing)
// 2. lib/auth.ts - Auth utilities
// 3. lib/jwt.ts - JWT handling
// 4. services/authService.ts - Auth service
// 5. services/sessionService.ts - Session service
// 6. app/api/auth/session/route.ts - Session endpoint
// 7. app/api/auth/me/route.ts - Current user endpoint
// 8. types/user.ts - User types
// 9. types/security.ts - Security types
// 10. prisma/schema.prisma - User, Session, ActiveSession models
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { getToken, JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import { ERROR_CODES, HTTP_STATUS, type APIError } from '@/types/api';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthUser {
    id: string;
    email: string;
    name?: string | null;
    role: 'admin' | 'user';
    isAdmin: boolean;
}

export interface AuthContext {
    user: AuthUser;
    token: JWT;
    session: Session | null;
}

export type AuthHandler = (
    request: NextRequest,
    context: AuthContext
) => Promise<NextResponse> | NextResponse | Promise<Response> | Response;

export interface AuthOptions {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    requireVerified?: boolean;
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Get session from request
 * @param request NextRequest object
 * @returns JWT token or null
 */
export async function getSession(request: NextRequest): Promise<JWT | null> {
    try {
        const token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET,
        });
        return token;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}

/**
 * Validate JWT token
 * @param token JWT token
 * @returns boolean indicating if token is valid
 */
export function validateToken(token: JWT | null): boolean {
    if (!token) return false;
    if (!token.id || !token.email) return false;

    // Check if token is expired (NextAuth handles this, but double check)
   if (token.exp && Date.now() >= Number(token.exp) * 1000) {
  return false;
}


    return true;
}

/**
 * Extract user from token
 * @param token JWT token
 * @returns AuthUser object
 */
export function getUserFromToken(token: JWT): AuthUser {
    return {
        id: token.id,
        email: token.email,
        name: token.name,
        role: token.role || 'user',
        isAdmin: token.isAdmin || false,
    };
}

/**
 * Create error response
 * @param error Error message
 * @param code Error code
 * @param status HTTP status code
 * @returns NextResponse with error
 */
function createErrorResponse(
    error: string,
    code: string,
    status: number
): NextResponse {
    const errorResponse: APIError = {
        success: false,
        error,
        message: error,
        code,
        statusCode: status,
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status });
}

// =============================================================================
// MIDDLEWARE WRAPPERS
// =============================================================================

/**
 * Wrap API handler with authentication check
 * Requires user to be authenticated
 * 
 * @param handler API handler function
 * @returns Wrapped handler with auth check
 * 
 * @example
 * export const GET = withAuth(async (req, { user }) => {
 *   return NextResponse.json({ user });
 * });
 */
export function withAuth(handler: AuthHandler) {
    return async (request: NextRequest) => {
        const token = await getSession(request);

        if (!token || !validateToken(token)) {
            return createErrorResponse(
                'Authentication required',
                ERROR_CODES.UNAUTHORIZED,
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        const user = getUserFromToken(token);
        const context: AuthContext = {
            user,
            token,
            session: null,
        };

        return handler(request, context);
    };
}

/**
 * Wrap API handler with optional authentication
 * Attaches user if authenticated, but doesn't require it
 * 
 * @param handler API handler function
 * @returns Wrapped handler with optional auth
 * 
 * @example
 * export const GET = withOptionalAuth(async (req, { user }) => {
 *   if (user) {
 *     return NextResponse.json({ authenticated: true, user });
 *   }
 *   return NextResponse.json({ authenticated: false });
 * });
 */
export function withOptionalAuth(handler: AuthHandler) {
    return async (request: NextRequest) => {
        const token = await getSession(request);

        let context: AuthContext;

        if (token && validateToken(token)) {
            const user = getUserFromToken(token);
            context = {
                user,
                token,
                session: null,
            };
        } else {
            // Create empty context for unauthenticated requests
            context = {
                user: null as any,
                token: null as any,
                session: null,
            };
        }

        return handler(request, context);
    };
}

/**
 * Wrap API handler with admin authentication check
 * Requires user to be authenticated AND be an admin
 * 
 * @param handler API handler function
 * @returns Wrapped handler with admin auth check
 * 
 * @example
 * export const GET = withAdminAuth(async (req, { user }) => {
 *   // Only admins can access this
 *   return NextResponse.json({ admin: true });
 * });
 */
export function withAdminAuth(handler: AuthHandler) {
    return async (request: NextRequest) => {
        const token = await getSession(request);

        if (!token || !validateToken(token)) {
            return createErrorResponse(
                'Authentication required',
                ERROR_CODES.UNAUTHORIZED,
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        if (token.role !== 'admin' && !token.isAdmin) {
            return createErrorResponse(
                'Admin access required',
                ERROR_CODES.FORBIDDEN,
                HTTP_STATUS.FORBIDDEN
            );
        }

        const user = getUserFromToken(token);
        const context: AuthContext = {
            user,
            token,
            session: null,
        };

        return handler(request, context);
    };
}

/**
 * Check if request has valid authentication
 * Simple boolean check without throwing or returning response
 * 
 * @param request NextRequest object
 * @returns boolean indicating if authenticated
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
    const token = await getSession(request);
    return validateToken(token);
}

/**
 * Check if request is from an admin user
 * 
 * @param request NextRequest object
 * @returns boolean indicating if user is admin
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
    const token = await getSession(request);
    if (!validateToken(token)) return false;
    return token?.role === 'admin' || token?.isAdmin === true;
}

/**
 * Get current user from request
 * 
 * @param request NextRequest object
 * @returns AuthUser or null if not authenticated
 */
export async function getCurrentUser(
    request: NextRequest
): Promise<AuthUser | null> {
    const token = await getSession(request);
    if (!validateToken(token)) return null;
    return getUserFromToken(token!);
}

// =============================================================================
// LEGACY MIDDLEWARE (for compatibility)
// =============================================================================

/**
 * Classic middleware function for auth requirement
 * Can be used in middleware.ts or API routes
 * 
 * @param request NextRequest object
 * @returns NextResponse or null if authorized
 */
export async function requireAuth(
    request: NextRequest
): Promise<NextResponse | null> {
    const token = await getSession(request);

    if (!token || !validateToken(token)) {
        return createErrorResponse(
            'Authentication required',
            ERROR_CODES.UNAUTHORIZED,
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    return null; // null means proceed
}

/**
 * Classic middleware function for admin requirement
 * 
 * @param request NextRequest object
 * @returns NextResponse or null if authorized
 */
export async function requireAdmin(
    request: NextRequest
): Promise<NextResponse | null> {
    const token = await getSession(request);

    if (!token || !validateToken(token)) {
        return createErrorResponse(
            'Authentication required',
            ERROR_CODES.UNAUTHORIZED,
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    if (token.role !== 'admin' && !token.isAdmin) {
        return createErrorResponse(
            'Admin access required',
            ERROR_CODES.FORBIDDEN,
            HTTP_STATUS.FORBIDDEN
        );
    }

    return null; // null means proceed
}

// =============================================================================
// EXPORTS
// =============================================================================

export default withAuth;
