// ============================================================================
// FILE: middleware/apiKeyAuth.ts
// PURPOSE: API key authentication middleware
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. middleware/auth.ts - Auth middleware pattern
// 2. middleware/adminAuth.ts - Admin auth pattern
// 3. lib/auth.ts - Auth utilities
// 4. lib/crypto.ts - Hashing for API key verification
// 5. services/rateLimitService.ts - API key rate limiting
// 6. app/api/api-keys/validate/route.ts - Key validation endpoint
// 7. types/api.ts - API key types
// 8. prisma/schema.prisma - ApiKey model
// 9. config/api.ts - API configuration
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ERROR_CODES, HTTP_STATUS, type APIError } from '@/types/api';
import crypto from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiKeyData {
    id: string;
    userId: string;
    name: string;
    scopes: string[];
    rateLimit: number;
    rateLimitWindow: number;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
}

export interface ApiKeyContext {
    apiKey: ApiKeyData;
    userId: string;
}

export type ApiKeyHandler = (
    request: NextRequest,
    context: ApiKeyContext
) => Promise<Response> | Response;

export interface ApiKeyOptions {
    /** Required permission scopes */
    requiredScopes?: string[];
    /** Allow both API key and session authentication */
    allowBoth?: boolean;
    /** Track usage statistics */
    trackUsage?: boolean;
}

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Extract API key from request headers
 * Supports both 'Authorization: Bearer <key>' and 'X-API-Key: <key>' formats
 * 
 * @param request NextRequest object
 * @returns API key string or null
 */
export function getApiKeyFromRequest(request: NextRequest): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers.get('x-api-key');
    if (apiKeyHeader) {
        return apiKeyHeader;
    }

    // Check query parameter (not recommended for production)
    const url = new URL(request.url);
    const apiKeyParam = url.searchParams.get('api_key');
    if (apiKeyParam) {
        return apiKeyParam;
    }

    return null;
}

/**
 * Hash API key for storage/comparison
 * 
 * @param apiKey Plain API key
 * @returns Hashed API key
 */
function hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate API key and return key data
 * 
 * @param apiKey Plain API key from request
 * @returns ApiKeyData or null if invalid
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyData | null> {
    try {
        const hashedKey = hashApiKey(apiKey);

        const keyRecord = await prisma.apiKey.findUnique({
            where: {
                keyHash: hashedKey,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        isActive: true,
                        isBanned: true,
                    },
                },
            },
        });

        if (!keyRecord) {
            return null;
        }

        // Check if key is active
        if (!keyRecord.isActive) {
            return null;
        }

        // Check if key is expired
        if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
            return null;
        }

        // Check if user is active
        if (!keyRecord.user.isActive || keyRecord.user.isBanned) {
            return null;
        }

        return {
            id: keyRecord.id,
            userId: keyRecord.userId,
            name: keyRecord.name,
            scopes: keyRecord.scopes as string[],
            rateLimit: keyRecord.rateLimit || 1000,
            rateLimitWindow: keyRecord.rateLimitWindow || 3600,
            lastUsedAt: keyRecord.lastUsedAt,
            expiresAt: keyRecord.expiresAt,
        };
    } catch (error) {
        console.error('Error validating API key:', error);
        return null;
    }
}

/**
 * Check if API key has required permissions
 * 
 * @param apiKey ApiKeyData object
 * @param requiredScopes Required permission scopes
 * @returns boolean indicating if permissions are sufficient
 */
export function checkApiKeyPermissions(
    apiKey: ApiKeyData,
    requiredScopes: string[]
): boolean {
    if (!requiredScopes || requiredScopes.length === 0) {
        return true;
    }

    // Check if key has all required scopes
    return requiredScopes.every((scope) => apiKey.scopes.includes(scope));
}

/**
 * Track API key usage
 * Updates last used timestamp and increments usage counter
 * 
 * @param keyId API key ID
 */
export async function trackApiKeyUsage(keyId: string): Promise<void> {
    try {
        await prisma.apiKey.update({
            where: { id: keyId },
            data: {
                lastUsedAt: new Date(),
                usageCount: {
                    increment: 1,
                },
            },
        });
    } catch (error) {
        console.error('Error tracking API key usage:', error);
        // Don't throw - tracking failures shouldn't break the request
    }
}

/**
 * Create error response
 * 
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
// MIDDLEWARE WRAPPER
// =============================================================================

/**
 * Wrap API handler with API key authentication
 * 
 * @param handler API handler function
 * @param options API key options
 * @returns Wrapped handler with API key auth
 * 
 * @example
 * export const GET = withApiKey(
 *   async (req, { apiKey, userId }) => {
 *     return NextResponse.json({ user: userId });
 *   },
 *   { requiredScopes: ['read:data'], trackUsage: true }
 * );
 */
export function withApiKey(
    handler: ApiKeyHandler,
    options: ApiKeyOptions = {}
) {
    return async (request: NextRequest) => {
        const apiKey = getApiKeyFromRequest(request);

        if (!apiKey) {
            return createErrorResponse(
                'API key required. Provide API key in Authorization header or X-API-Key header.',
                ERROR_CODES.UNAUTHORIZED,
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        // Validate API key
        const apiKeyData = await validateApiKey(apiKey);

        if (!apiKeyData) {
            return createErrorResponse(
                'Invalid or expired API key',
                ERROR_CODES.UNAUTHORIZED,
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        // Check permissions
        if (options.requiredScopes && options.requiredScopes.length > 0) {
            const hasPermissions = checkApiKeyPermissions(apiKeyData, options.requiredScopes);

            if (!hasPermissions) {
                return createErrorResponse(
                    `Insufficient permissions. Required scopes: ${options.requiredScopes.join(', ')}`,
                    ERROR_CODES.FORBIDDEN,
                    HTTP_STATUS.FORBIDDEN
                );
            }
        }

        // Track usage if enabled
        if (options.trackUsage !== false) {
            // Don't await - track asynchronously
            trackApiKeyUsage(apiKeyData.id).catch(console.error);
        }

        // Create context
        const context: ApiKeyContext = {
            apiKey: apiKeyData,
            userId: apiKeyData.userId,
        };

        return handler(request, context);
    };
}

/**
 * Wrap API handler with flexible authentication
 * Allows both API key and session authentication
 * 
 * @param handler API handler function
 * @param options API key options
 * @returns Wrapped handler with flexible auth
 * 
 * @example
 * export const GET = withFlexibleAuth(
 *   async (req, { userId }) => {
 *     return NextResponse.json({ user: userId });
 *   },
 *   { requiredScopes: ['read:data'] }
 * );
 */
export function withFlexibleAuth(
    handler: (request: NextRequest, context: { userId: string }) => Promise<Response> | Response,
    options: ApiKeyOptions = {}
) {
    return async (request: NextRequest) => {
        // Try API key first
        const apiKey = getApiKeyFromRequest(request);

        if (apiKey) {
            const apiKeyData = await validateApiKey(apiKey);

            if (apiKeyData) {
                // Check permissions
                if (options.requiredScopes && options.requiredScopes.length > 0) {
                    const hasPermissions = checkApiKeyPermissions(apiKeyData, options.requiredScopes);

                    if (!hasPermissions) {
                        return createErrorResponse(
                            `Insufficient permissions. Required scopes: ${options.requiredScopes.join(', ')}`,
                            ERROR_CODES.FORBIDDEN,
                            HTTP_STATUS.FORBIDDEN
                        );
                    }
                }

                // Track usage
                if (options.trackUsage !== false) {
                    trackApiKeyUsage(apiKeyData.id).catch(console.error);
                }

                return handler(request, { userId: apiKeyData.userId });
            }
        }

        // Fall back to session auth (implement based on your auth library)
        // For now, return error if API key is invalid
        return createErrorResponse(
            'Authentication required. Provide a valid API key or session.',
            ERROR_CODES.UNAUTHORIZED,
            HTTP_STATUS.UNAUTHORIZED
        );
    };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a new API key
 * Returns a random 32-character key
 * 
 * @returns Random API key string
 */
export function generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate API key format
 * Checks if key matches expected format (64 hex characters)
 * 
 * @param apiKey API key to validate
 * @returns boolean indicating if format is valid
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
    return /^[a-f0-9]{64}$/i.test(apiKey);
}

// =============================================================================
// DEFAULT SCOPES
// =============================================================================

export const API_SCOPES = {
    // Read operations
    READ_USER: 'read:user',
    READ_PROGRESS: 'read:progress',
    READ_GOALS: 'read:goals',
    READ_ACHIEVEMENTS: 'read:achievements',
    READ_PLATFORMS: 'read:platforms',

    // Write operations
    WRITE_USER: 'write:user',
    WRITE_PROGRESS: 'write:progress',
    WRITE_GOALS: 'write:goals',
    WRITE_PLATFORMS: 'write:platforms',

    // Special operations
    SYNC: 'sync',
    EXPORT: 'export',
    ADMIN: 'admin',

    // Wildcard
    ALL: '*',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export default withApiKey;
