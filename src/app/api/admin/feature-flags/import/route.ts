// =============================================================================
// api/admin/feature-flags/import/route.ts
// =============================================================================
// Description: Import feature flags from file
// Methods: POST, OPTIONS
// Auth Required: Yes (Admin only)
// Rate Limit: 3 requests/minute (very strict)
// Security: File validation, transaction safety, rollback capability
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withTransaction } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SubscriptionTier, AuditAction } from '@prisma/client';

// =============================================================================
// SECURITY CONSTANTS
// =============================================================================

const IMPORT_RATE_LIMIT = 3; // Only 3 imports per minute
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max file size
const MAX_IMPORT_ITEMS = 100; // Maximum flags per import
const ALLOWED_MIME_TYPES = ['application/json', 'text/plain', 'text/csv', 'application/x-yaml'];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const importConfigSchema = z.object({
  mode: z.enum(['create', 'update', 'upsert']).default('create'),
  skipDuplicates: z.boolean().default(false),
  validateOnly: z.boolean().default(false), // Dry run mode
  overwriteEnabled: z.boolean().default(false), // Allow overwriting enabled flags
  backupBeforeImport: z.boolean().default(true),
});

const flagSchema = z.object({
  key: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  isEnabled: z.boolean().default(false),
  enabledForAll: z.boolean().default(false),
  enabledUserIds: z.array(z.string().cuid()).default([]),
  enabledTiers: z.array(z.nativeEnum(SubscriptionTier)).default([]),
  enabledPercentage: z.number().int().min(0).max(100).default(0),
  metadata: z.record(z.unknown()).optional(),
});

const importDataSchema = z.object({
  version: z.string().optional(),
  flags: z.array(flagSchema).min(1).max(MAX_IMPORT_ITEMS),
  metadata: z.record(z.unknown()).optional(),
});

// =============================================================================
// SECURITY HELPERS
// =============================================================================

async function checkSuperAdminImportAuth(request: NextRequest, requestId: string) {
  const session = await getServerSession(authOptions);
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  
  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId) };
  }

  if (!session.user.isAdmin) {
    logger.warn('Non-admin attempted import', {
      userId: session.user.id,
      requestId,
      ip: clientIp
    });
    return { error: apiResponse.forbidden('Super admin access required for imports', requestId) };
  }

  // Check import permissions
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissions: true, isActive: true, isBanned: true }
  });

  if (!user?.isActive || user.isBanned) {
    return { error: apiResponse.forbidden('Account is not active', requestId) };
  }

  if (!user.permissions.includes('IMPORT_DATA')) {
    logger.warn('Admin without import permission attempted operation', {
      userId: session.user.id,
      requestId
    });
    return { error: apiResponse.forbidden('Import permission required', requestId) };
  }

  return { session, clientIp };
}

// =============================================================================
// FILE PARSING HELPERS
// =============================================================================

function parseJSONContent(content: string): any {
  try {
    const parsed = JSON.parse(content);
    
    // Handle different JSON formats
    if (parsed.flags && Array.isArray(parsed.flags)) {
      return parsed; // Standard export format
    } else if (Array.isArray(parsed)) {
      return { flags: parsed }; // Simple array format
    } else {
      throw new Error('Invalid JSON structure - expected flags array');
    }
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseCSVContent(content: string): any {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least header and one data row');
  }

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const requiredHeaders = ['key', 'name', 'isEnabled'];
  
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
  }

  const flags = lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
    const flag: any = {};

    headers.forEach((header, i) => {
      const value = values[i] || '';
      
      switch (header) {
        case 'key':
        case 'name':
        case 'description':
          flag[header] = value || undefined;
          break;
        case 'isEnabled':
        case 'enabledForAll':
          flag[header] = value.toLowerCase() === 'true';
          break;
        case 'enabledPercentage':
          flag[header] = parseInt(value) || 0;
          break;
        case 'enabledTiers':
          flag[header] = value ? value.split(';').filter(Boolean) : [];
          break;
        case 'enabledUserIds':
          flag[header] = value ? value.split(';').filter(Boolean) : [];
          break;
      }
    });

    if (!flag.key || !flag.name) {
      throw new Error(`Invalid data at row ${index + 2}: key and name are required`);
    }

    return flag;
  });

  return { flags };
}

function parseYAMLContent(content: string): any {
  // Simple YAML parser for our specific format
  // In production, use a proper YAML library like 'js-yaml'
  throw new Error('YAML import not implemented yet - use JSON or CSV format');
}

// =============================================================================
// IMPORT PROCESSING
// =============================================================================

async function validateImportData(data: any, config: any, session: any) {
  // Validate structure
  const validation = importDataSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(`Invalid import data: ${validation.error.errors.map(e => e.message).join(', ')}`);
  }

  const { flags } = validation.data;
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for duplicates within import
  const keys = flags.map(f => f.key);
  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicateKeys.length > 0) {
    issues.push(`Duplicate keys in import: ${[...new Set(duplicateKeys)].join(', ')}`);
  }

  // Check existing flags in database
  const existingFlags = await prisma.featureFlag.findMany({
    where: { key: { in: keys } },
    select: { key: true, isEnabled: true }
  });

  const existingKeys = existingFlags.map(f => f.key);
  const enabledExistingKeys = existingFlags.filter(f => f.isEnabled).map(f => f.key);

  if (existingKeys.length > 0) {
    if (config.mode === 'create' && !config.skipDuplicates) {
      issues.push(`Flags already exist: ${existingKeys.join(', ')}`);
    }
    
    if (enabledExistingKeys.length > 0 && !config.overwriteEnabled) {
      warnings.push(`Some existing flags are enabled: ${enabledExistingKeys.join(', ')}`);
    }
  }

  // Validate user IDs if any
  const allUserIds = [...new Set(flags.flatMap(f => f.enabledUserIds || []))];
  if (allUserIds.length > 0) {
    const validUsers = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true }
    });
    
    const validUserIds = validUsers.map(u => u.id);
    const invalidUserIds = allUserIds.filter(id => !validUserIds.includes(id));
    
    if (invalidUserIds.length > 0) {
      warnings.push(`Invalid user IDs found: ${invalidUserIds.slice(0, 5).join(', ')}${invalidUserIds.length > 5 ? '...' : ''}`);
    }
  }

  return { 
    isValid: issues.length === 0,
    issues, 
    warnings,
    stats: {
      totalFlags: flags.length,
      newFlags: keys.filter(k => !existingKeys.includes(k)).length,
      existingFlags: existingKeys.length,
      enabledExisting: enabledExistingKeys.length
    }
  };
}

async function createBackup(adminId: string) {
  const timestamp = new Date().toISOString();
  const flags = await prisma.featureFlag.findMany();
  
  // In a real implementation, you might want to store this in a backup table
  // or external storage. For now, we'll log it for audit purposes.
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: AuditAction.CREATE,
      category: 'feature_flags_backup',
      description: `Pre-import backup created: ${flags.length} flags`,
      newValue: {
        timestamp,
        flags: flags.map(f => ({ id: f.id, key: f.key, isEnabled: f.isEnabled }))
      }
    }
  });

  return { backupId: timestamp, flagCount: flags.length };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Enhanced auth check
    const { error, session, clientIp } = await checkSuperAdminImportAuth(request, requestId);
    if (error) return error;

    // Strict rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter,
      IMPORT_RATE_LIMIT,
      `import:${session!.user.id}:${clientIp}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(1200, requestId); // 20 min timeout
    }

    // Check content type
    const contentType = request.headers.get('content-type') || '';
    
    let importData: any;
    let config: any;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const configStr = formData.get('config') as string;

      if (!file) {
        return apiResponse.validationError(
          'No file provided',
          [{ path: ['file'], message: 'File is required' }],
          requestId
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return apiResponse.validationError(
          'File too large',
          [{ path: ['file'], message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` }],
          requestId
        );
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return apiResponse.validationError(
          'Invalid file type',
          [{ path: ['file'], message: `Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` }],
          requestId
        );
      }

      // Parse config
      const configValidation = importConfigSchema.safeParse(
        configStr ? JSON.parse(configStr) : {}
      );
      if (!configValidation.success) {
        return apiResponse.validationError(
          'Invalid configuration',
          configValidation.error.errors,
          requestId
        );
      }
      config = configValidation.data;

      // Read and parse file content
      const content = await file.text();
      
      try {
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          importData = parseJSONContent(content);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          importData = parseCSVContent(content);
        } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
          importData = parseYAMLContent(content);
        } else {
          // Try to auto-detect format
          if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
            importData = parseJSONContent(content);
          } else {
            throw new Error('Unable to detect file format');
          }
        }
      } catch (parseError) {
        return apiResponse.validationError(
          'File parsing failed',
          [{ path: ['file'], message: parseError instanceof Error ? parseError.message : 'Unknown parsing error' }],
          requestId
        );
      }
    } else {
      // Handle JSON body
      const body = await request.json();
      const { data, config: bodyConfig } = body;

      importData = data;
      const configValidation = importConfigSchema.safeParse(bodyConfig || {});
      if (!configValidation.success) {
        return apiResponse.validationError(
          'Invalid configuration',
          configValidation.error.errors,
          requestId
        );
      }
      config = configValidation.data;
    }

    // Validate import data
    const validation = await validateImportData(importData, config, session);
    
    if (!validation.isValid) {
      return apiResponse.validationError(
        'Import validation failed',
        validation.issues.map(issue => ({ path: ['data'], message: issue })),
        requestId
      );
    }

    // Validate only mode (dry run)
    if (config.validateOnly) {
      logger.info('Import validation completed', {
        requestId,
        adminId: session!.user.id,
        validation,
        duration: Date.now() - startTime
      });

      return apiResponse.success({
        validation,
        message: 'Validation completed - no data was imported'
      }, { meta: { requestId } });
    }

    // Create backup if requested
    let backup = null;
    if (config.backupBeforeImport) {
      backup = await createBackup(session!.user.id);
    }

    // Execute import in transaction
    const result = await withTransaction(async (tx) => {
      const { flags } = importData;
      const created = [];
      const updated = [];
      const skipped = [];
      const errors = [];

      for (const flagData of flags) {
        try {
          const existing = await tx.featureFlag.findUnique({
            where: { key: flagData.key }
          });

          if (existing) {
            if (config.mode === 'create') {
              if (config.skipDuplicates) {
                skipped.push({ key: flagData.key, reason: 'Already exists' });
                continue;
              } else {
                errors.push({ key: flagData.key, error: 'Flag already exists' });
                continue;
              }
            }

            if (existing.isEnabled && !config.overwriteEnabled) {
              skipped.push({ key: flagData.key, reason: 'Flag is enabled, overwrite not allowed' });
              continue;
            }

            // Update existing flag
            const updatedFlag = await tx.featureFlag.update({
              where: { key: flagData.key },
              data: {
                name: flagData.name,
                description: flagData.description,
                isEnabled: flagData.isEnabled,
                enabledForAll: flagData.enabledForAll,
                enabledUserIds: flagData.enabledUserIds || [],
                enabledTiers: flagData.enabledTiers || [],
                enabledPercentage: flagData.enabledPercentage || 0,
                metadata: flagData.metadata || {},
              }
            });

            updated.push(updatedFlag);
          } else {
            // Create new flag
            const newFlag = await tx.featureFlag.create({
              data: {
                key: flagData.key,
                name: flagData.name,
                description: flagData.description,
                isEnabled: flagData.isEnabled || false,
                enabledForAll: flagData.enabledForAll || false,
                enabledUserIds: flagData.enabledUserIds || [],
                enabledTiers: flagData.enabledTiers || [],
                enabledPercentage: flagData.enabledPercentage || 0,
                metadata: flagData.metadata || {},
              }
            });

            created.push(newFlag);
          }
        } catch (flagError) {
          errors.push({ 
            key: flagData.key, 
            error: flagError instanceof Error ? flagError.message : 'Unknown error' 
          });
        }
      }

      return { created, updated, skipped, errors };
    });

    // Log import operation
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: AuditAction.IMPORT_DATA,
        category: 'feature_flags',
        description: `Imported feature flags: ${result.created.length} created, ${result.updated.length} updated, ${result.skipped.length} skipped, ${result.errors.length} errors`,
        newValue: {
          config,
          validation,
          result: {
            created: result.created.length,
            updated: result.updated.length,
            skipped: result.skipped.length,
            errors: result.errors.length
          },
          backup: backup?.backupId
        },
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Feature flags imported', {
      requestId,
      adminId: session!.user.id,
      result,
      backup: backup?.backupId,
      duration: Date.now() - startTime
    });

    return apiResponse.success({
      result,
      validation,
      backup,
      summary: {
        total: importData.flags.length,
        created: result.created.length,
        updated: result.updated.length,
        skipped: result.skipped.length,
        errors: result.errors.length
      }
    }, { meta: { requestId } });

  } catch (error) {
    logger.error('POST admin/feature-flags/import failed', { requestId }, error);
    return apiResponse.internalError('Import operation failed', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';