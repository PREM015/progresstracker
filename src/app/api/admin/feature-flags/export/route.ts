// =============================================================================
// api/admin/feature-flags/export/route.ts
// =============================================================================
// Description: Export feature flags data
// Methods: GET, POST, OPTIONS
// Auth Required: Yes (Admin only)
// Rate Limit: 5 requests/minute
// Security: Admin verification, audit logging, data sanitization
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { AuditAction } from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const exportSchema = z.object({
  format: z.enum(['json', 'csv', 'yaml']).default('json'),
  includeDisabled: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  includeAuditInfo: z.boolean().default(false),
  sanitize: z.boolean().default(true), // Remove sensitive data
  keys: z.array(z.string()).optional(), // Export specific keys only
});

// =============================================================================
// SECURITY HELPERS
// =============================================================================

async function checkAdminExportAuth(request: NextRequest, requestId: string) {
  const session = await getServerSession(authOptions);
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId) };
  }

  if (!session.user.isAdmin) {
    logger.warn('Non-admin attempted export', {
      userId: session.user.id,
      requestId,
      ip: clientIp
    });
    return { error: apiResponse.forbidden('Admin access required', requestId) };
  }

  // Check export permissions
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissions: true, isActive: true }
  });

  if (!user?.permissions.includes('EXPORT_DATA')) {
    logger.warn('Admin without export permission attempted operation', {
      userId: session.user.id,
      requestId
    });
    return { error: apiResponse.forbidden('Export permission required', requestId) };
  }

  return { session, clientIp };
}

// =============================================================================
// EXPORT FORMATTERS
// =============================================================================

function sanitizeFlag(flag: any, sanitize: boolean) {
  if (!sanitize) return flag;

  // Remove sensitive information
  const sanitized = { ...flag };
  delete sanitized.enabledUserIds; // Don't export user IDs for privacy

  // Sanitize metadata
  if (sanitized.metadata && typeof sanitized.metadata === 'object') {
    const { apiKeys, secrets, ...cleanMetadata } = sanitized.metadata;
    sanitized.metadata = cleanMetadata;
  }

  return sanitized;
}

function formatAsJSON(flags: any[], includeAuditInfo: boolean) {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    flags: flags,
    ...(includeAuditInfo && {
      audit: {
        totalFlags: flags.length,
        enabledFlags: flags.filter(f => f.isEnabled).length,
        disabledFlags: flags.filter(f => !f.isEnabled).length,
      }
    })
  };
}

function formatAsCSV(flags: any[]) {
  const headers = [
    'key', 'name', 'description', 'isEnabled', 'enabledForAll',
    'enabledTiers', 'enabledPercentage', 'createdAt', 'updatedAt'
  ];

  const rows = flags.map(flag => [
    flag.key,
    flag.name,
    flag.description || '',
    flag.isEnabled,
    flag.enabledForAll,
    flag.enabledTiers.join(';'),
    flag.enabledPercentage,
    flag.createdAt,
    flag.updatedAt
  ]);

  return [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

function formatAsYAML(flags: any[]) {
  const yamlContent = flags.map(flag => {
    return [
      `- key: "${flag.key}"`,
      `  name: "${flag.name}"`,
      `  description: "${flag.description || ''}"`,
      `  isEnabled: ${flag.isEnabled}`,
      `  enabledForAll: ${flag.enabledForAll}`,
      `  enabledTiers: [${flag.enabledTiers.join(', ')}]`,
      `  enabledPercentage: ${flag.enabledPercentage}`,
      `  createdAt: "${flag.createdAt}"`,
      `  updatedAt: "${flag.updatedAt}"`
    ].join('\n');
  }).join('\n\n');

  return `# Feature Flags Export\n# Generated at: ${new Date().toISOString()}\nfeature_flags:\n${yamlContent}`;
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

/**
 * GET - Quick export with query parameters
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Auth check
    const { error, session, clientIp } = await checkAdminExportAuth(request, requestId);
    if (error) return error;

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      5,
      `export:${session!.user.id}:${clientIp}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(300, requestId);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeDisabled = searchParams.get('includeDisabled') !== 'false';
    const sanitize = searchParams.get('sanitize') !== 'false';

    // Build query
    const where: any = {};
    if (!includeDisabled) {
      where.isEnabled = true;
    }

    // Fetch flags
    const flags = await prisma.featureFlag.findMany({
      where,
      orderBy: { key: 'asc' }
    });

    // Sanitize data
    const processedFlags = flags.map(flag => sanitizeFlag(flag, sanitize));

    // Format based on request
    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        content = formatAsCSV(processedFlags);
        contentType = 'text/csv';
        filename = `feature-flags-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'yaml':
        content = formatAsYAML(processedFlags);
        contentType = 'text/yaml';
        filename = `feature-flags-${new Date().toISOString().split('T')[0]}.yaml`;
        break;
      default:
        content = JSON.stringify(formatAsJSON(processedFlags, false), null, 2);
        contentType = 'application/json';
        filename = `feature-flags-${new Date().toISOString().split('T')[0]}.json`;
    }

    // Log export operation
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: AuditAction.EXPORT_DATA,
        category: 'feature_flags',
        description: `Exported ${flags.length} feature flags in ${format} format`,
        metadata: {
          format,
          count: flags.length,
          includeDisabled,
          sanitize
        },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Feature flags exported', {
      requestId,
      adminId: session!.user.id,
      format,
      count: flags.length,
      duration: Date.now() - startTime
    });

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    logger.error('GET admin/feature-flags/export failed', { requestId }, error);
    return apiResponse.internalError('Export operation failed', requestId);
  }
}

/**
 * POST - Advanced export with body configuration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Auth check
    const { error, session, clientIp } = await checkAdminExportAuth(request, requestId);
    if (error) return error;

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      3,
      `export-advanced:${session!.user.id}:${clientIp}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(600, requestId);
    }

    // Parse body
    const body = await request.json();
    const validation = exportSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid export configuration',
        validation.error.errors,
        requestId
      );
    }

    const config = validation.data;

    // Build query
    const where: any = {};

    if (!config.includeDisabled) {
      where.isEnabled = true;
    }

    if (config.keys && config.keys.length > 0) {
      where.key = { in: config.keys };
    }

    // Fetch flags with optional audit info
    const flags = await prisma.featureFlag.findMany({
      where,
      orderBy: { key: 'asc' },
      ...(config.includeAuditInfo && {
        include: {
          _count: {
            select: {
              // Add any related counts if needed
            }
          }
        }
      })
    } as any);

    if (flags.length === 0) {
      return apiResponse.success(
        { message: 'No feature flags found matching criteria' },
        { meta: { requestId } }
      );
    }

    // Process and sanitize data
    const processedFlags = flags.map(flag => {
      const processed = sanitizeFlag(flag, config.sanitize);

      if (!config.includeMetadata) {
        delete processed.metadata;
      }

      return processed;
    });

    // Format data
    let content: string;
    let contentType: string;
    let filename: string;

    switch (config.format) {
      case 'csv':
        content = formatAsCSV(processedFlags);
        contentType = 'text/csv';
        filename = `feature-flags-export-${Date.now()}.csv`;
        break;
      case 'yaml':
        content = formatAsYAML(processedFlags);
        contentType = 'text/yaml';
        filename = `feature-flags-export-${Date.now()}.yaml`;
        break;
      default:
        content = JSON.stringify(formatAsJSON(processedFlags, config.includeAuditInfo), null, 2);
        contentType = 'application/json';
        filename = `feature-flags-export-${Date.now()}.json`;
    }

    // Log detailed export operation
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: AuditAction.EXPORT_DATA,
        category: 'feature_flags',
        description: `Advanced export: ${flags.length} flags in ${config.format} format`,
        metadata: {
          ...config,
          count: flags.length,
          exportSize: content.length
        },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Advanced feature flags export', {
      requestId,
      adminId: session!.user.id,
      config,
      count: flags.length,
      size: content.length,
      duration: Date.now() - startTime
    });

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Request-ID': requestId,
        'X-Export-Count': String(flags.length),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    logger.error('POST admin/feature-flags/export failed', { requestId }, error);
    return apiResponse.internalError('Advanced export operation failed', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';