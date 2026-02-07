/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================================
// FILE: middleware/maintenance.ts
// PURPOSE: Maintenance mode check middleware
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. middleware/auth.ts - Middleware pattern
// 2. middleware/adminAuth.ts - Admin bypass pattern
// 3. services/maintenanceService.ts - Maintenance service
// 4. app/api/maintenance/route.ts - Maintenance status API
// 5. app/api/admin/maintenance/route.ts - Admin maintenance
// 6. app/maintenance/page.tsx - Maintenance page
// 7. types/maintenance.ts - Maintenance types
// 8. config/maintenance.ts - Maintenance configuration
// 9. prisma/schema.prisma - MaintenanceWindow model
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ERROR_CODES, HTTP_STATUS, type APIError } from '@/types/api';
import { getSession, validateToken } from './auth';

// =============================================================================
// TYPES
// =============================================================================

export interface MaintenanceInfo {
    isActive: boolean;
    startTime?: Date;
    endTime?: Date;
    message?: string;
    affectedServices?: string[];
}

export interface MaintenanceWindow {
    id: string;
    title: string;
    message: string;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
    affectedServices: string[];
    createdBy?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type MaintenanceHandler = (
    request: NextRequest
) => Promise<Response> | Response;

// =============================================================================
// IN-MEMORY CACHE
// =============================================================================

let maintenanceCache: {
    info: MaintenanceInfo | null;
    lastChecked: number;
} = {
    info: null,
    lastChecked: 0,
};

const CACHE_TTL = 10000; // 10 seconds

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Check if system is currently in maintenance mode
 * Uses cache to avoid frequent database queries
 * 
 * @param skipCache Skip cache and force database check
 * @returns boolean indicating if in maintenance mode
 */
export async function isMaintenanceMode(skipCache = false): Promise<boolean> {
    const info = await getMaintenanceInfo(skipCache);
    return info?.isActive || false;
}

/**
 * Get current maintenance information
 * 
 * @param skipCache Skip cache and force database check
 * @returns MaintenanceInfo or null
 */
export async function getMaintenanceInfo(skipCache = false): Promise<MaintenanceInfo | null> {
    const now = Date.now();

    // Return cached info if still valid
    if (!skipCache && maintenanceCache.info && (now - maintenanceCache.lastChecked) < CACHE_TTL) {
        return maintenanceCache.info;
    }

    try {
        // Check for active maintenance window
        const activeWindow = await prisma.maintenanceWindow.findFirst({
            where: {
                isActive: true,
                startTime: {
                    lte: new Date(),
                },
                endTime: {
                    gte: new Date(),
                },
            },
            orderBy: {
                startTime: 'desc',
            },
        });

        let info: MaintenanceInfo | null = null;

        if (activeWindow) {
            info = {
                isActive: true,
                startTime: activeWindow.startTime,
                endTime: activeWindow.endTime,
                message: activeWindow.message,
                affectedServices: activeWindow.affectedServices as string[],
            };
        } else {
            info = {
                isActive: false,
            };
        }

        // Update cache
        maintenanceCache = {
            info,
            lastChecked: now,
        };

        return info;
    } catch (error) {
        console.error('Error checking maintenance mode:', error);
        // On error, assume not in maintenance to avoid blocking access
        return { isActive: false };
    }
}

/**
 * Check if request should bypass maintenance mode
 * 
 * @param request NextRequest object
 * @param info MaintenanceInfo
 * @returns boolean indicating if bypass is allowed
 */
export async function shouldBypassMaintenance(
    request: NextRequest,
    info: MaintenanceInfo
): Promise<boolean> {
    // 1. Check if path is whitelisted
    const pathname = new URL(request.url).pathname;

    // Always allow maintenance page itself and health checks
    const alwaysAllowedPaths = [
        '/maintenance',
        '/api/health',
        '/api/maintenance',
        '/_next',
        '/favicon.ico',
    ];

    if (alwaysAllowedPaths.some(path => pathname.startsWith(path))) {
        return true;
    }

    // 2. Check if user is admin (admins can always bypass)
    const token = await getSession(request);
    if (token && validateToken(token)) {
        if (token.role === 'admin' || token.isAdmin) {
            return true;
        }
    }

    return false;
}

/**
 * Get client IP address from request
 * 
 * @param request NextRequest object
 * @returns IP address string or null
 */
function getClientIp(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    return realIp;
}

/**
 * Create maintenance mode response
 * 
 * @param info MaintenanceInfo
 * @param request NextRequest
 * @returns NextResponse with maintenance message
 */
function createMaintenanceResponse(
    info: MaintenanceInfo,
    request: NextRequest
): NextResponse {
    const pathname = new URL(request.url).pathname;

    // If it's an API call, return JSON
    if (pathname.startsWith('/api/')) {
        const errorResponse: APIError = {
            success: false,
            error: 'Service temporarily unavailable',
            message: info.message || 'We are currently performing scheduled maintenance. Please try again later.',
            code: ERROR_CODES.SERVICE_UNAVAILABLE,
            statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
            details: {
                maintenanceMode: true,
                startTime: info.startTime,
                endTime: info.endTime,
            },
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json(errorResponse, {
            status: HTTP_STATUS.SERVICE_UNAVAILABLE,
            headers: {
                'Retry-After': info.endTime
                    ? Math.ceil((info.endTime.getTime() - Date.now()) / 1000).toString()
                    : '3600',
            },
        });
    }

    // For web requests, redirect to maintenance page
    const maintenanceUrl = new URL('/maintenance', request.url);

    // Add query params with maintenance info
    if (info.endTime) {
        maintenanceUrl.searchParams.set('endTime', info.endTime.toISOString());
    }
    if (info.message) {
        maintenanceUrl.searchParams.set('message', info.message);
    }

    return NextResponse.rewrite(maintenanceUrl);
}

/**
 * Clear maintenance cache
 * Useful when updating maintenance settings
 */
export function clearMaintenanceCache(): void {
    maintenanceCache = {
        info: null,
        lastChecked: 0,
    };
}

// =============================================================================
// MIDDLEWARE WRAPPER
// =============================================================================

/**
 * Wrap API handler with maintenance mode check
 * Blocks access if in maintenance mode (unless bypass conditions met)
 * 
 * @param handler API handler function
 * @returns Wrapped handler with maintenance check
 * 
 * @example
 * export const GET = withMaintenanceCheck(async (req) => {
 *   return NextResponse.json({ data: 'success' });
 * });
 */
export function withMaintenanceCheck(handler: MaintenanceHandler) {
    return async (request: NextRequest) => {
        const info = await getMaintenanceInfo();

        // If not in maintenance mode, proceed normally
        if (!info || !info.isActive) {
            return handler(request);
        }

        // Check if request should bypass maintenance
        const bypass = await shouldBypassMaintenance(request, info);

        if (bypass) {
            return handler(request);
        }

        // Return maintenance response
        return createMaintenanceResponse(info, request);
    };
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * Enable maintenance mode
 * 
 * @param options Maintenance window options
 * @returns Created maintenance window
 */
export async function enableMaintenance(options: {
    title: string;
    message: string;
    startTime?: Date;
    endTime?: Date;
    affectedServices?: string[];
    createdBy?: string;
}): Promise<MaintenanceWindow> {
    // Deactivate any existing active windows
    await prisma.maintenanceWindow.updateMany({
        where: { isActive: true },
        data: { isActive: false },
    });

    // Create new maintenance window
    const window = await prisma.maintenanceWindow.create({
        data: {
            title: options.title,
            message: options.message,
            startTime: options.startTime || new Date(),
            endTime: options.endTime || new Date(Date.now() + 3600000), // 1 hour default
            isActive: true,
            affectedServices: options.affectedServices || [],
            createdBy: options.createdBy,
        },
    });

    // Clear cache to force refresh
    clearMaintenanceCache();

    return window as MaintenanceWindow;
}

/**
 * Disable maintenance mode
 * 
 * @returns boolean indicating success
 */
export async function disableMaintenance(): Promise<boolean> {
    try {
        await prisma.maintenanceWindow.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });

        // Clear cache
        clearMaintenanceCache();

        return true;
    } catch (error) {
        console.error('Error disabling maintenance mode:', error);
        return false;
    }
}

/**
 * Get maintenance schedule
 * Returns upcoming and past maintenance windows
 * 
 * @param limit Number of windows to return
 * @returns Array of maintenance windows
 */
export async function getMaintenanceSchedule(limit = 10): Promise<MaintenanceWindow[]> {
    const windows = await prisma.maintenanceWindow.findMany({
        orderBy: {
            startTime: 'desc',
        },
        take: limit,
    });

    return windows as MaintenanceWindow[];
}

// =============================================================================
// ENVIRONMENT-BASED MAINTENANCE
// =============================================================================

/**
 * Check if maintenance is forced via environment variable
 * Useful for emergency maintenance without database access
 * 
 * @returns boolean indicating if maintenance is forced
 */
export function isMaintenanceForcedByEnv(): boolean {
    return process.env.FORCE_MAINTENANCE === 'true';
}

/**
 * Get maintenance message from environment
 * 
 * @returns Maintenance message or default
 */
export function getMaintenanceMessageFromEnv(): string {
    return process.env.MAINTENANCE_MESSAGE || 'We are currently performing scheduled maintenance.';
}

// =============================================================================
// EXPORTS
// =============================================================================

export default withMaintenanceCheck;
