// =============================================================================
// src/app/api/goals/import/route.ts
// =============================================================================
// Description: Import goals from file (JSON/CSV)
// Methods: POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 5 requests/minute
// =============================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { GoalType, GoalMetric, PlatformCategory, GoalStatus, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { auditLogService } from '@/services/auditLogService';
import { addDays, endOfDay, endOfWeek, endOfMonth } from 'date-fns';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 5;
const MAX_IMPORT_SIZE = 100;
const MAX_ACTIVE_GOALS = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const importGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000).optional().nullable(),
  target: z.coerce.number().positive('Target must be positive').max(999999),
  unit: z.string().max(50).optional().nullable(),
  category: z.nativeEnum(PlatformCategory),
  goalType: z.nativeEnum(GoalType).optional().default(GoalType.CUSTOM),
  metric: z.nativeEnum(GoalMetric).optional().default(GoalMetric.CUSTOM),
  customMetric: z.string().max(100).optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  isPublic: z.boolean().optional().default(false),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  reminderEnabled: z.boolean().optional().default(false),
  progress: z.coerce.number().min(0).optional().default(0),
});

const importBodySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  data: z.string().optional(),
  goals: z.array(importGoalSchema).max(MAX_IMPORT_SIZE).optional(),
  skipDuplicates: z.boolean().default(true),
  dryRun: z.boolean().default(false),
  overwriteExisting: z.boolean().default(false),
  setActive: z.boolean().default(true),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

async function validateRequest(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `goals-import:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(120, requestId),
      session: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function calculateDeadline(goalType: GoalType, startDate: Date): Date | null {
  switch (goalType) {
    case GoalType.DAILY:
      return endOfDay(startDate);
    case GoalType.WEEKLY:
      return endOfWeek(startDate);
    case GoalType.MONTHLY:
      return endOfMonth(startDate);
    case GoalType.QUARTERLY:
      return addDays(startDate, 90);
    case GoalType.YEARLY:
      return addDays(startDate, 365);
    default:
      return null;
  }
}

function parseCSV(csvData: string): Record<string, unknown>[] {
  const lines = csvData.split('\n').filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Parse headers
  const headerLine = lines[0];
  const headers: string[] = [];
  let inQuotes = false;
  let currentField = '';

  for (const char of headerLine) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(currentField.trim().toLowerCase().replace(/\s+/g, '_'));
      currentField = '';
    } else {
      currentField += char;
    }
  }
  headers.push(currentField.trim().toLowerCase().replace(/\s+/g, '_'));

  // Parse rows
  const results: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    inQuotes = false;
    currentField = '';

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    values.push(currentField.trim());

    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      let value: unknown = values[index] ?? '';
      
      // Try to convert to number
      if (value && !isNaN(Number(value))) {
        value = Number(value);
      }
      // Convert boolean strings
      else if (value === 'true') value = true;
      else if (value === 'false') value = false;
      // Convert empty strings to null
      else if (value === '') value = null;

      row[header] = value;
    });

    results.push(row);
  }

  return results;
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  return addHeaders(response, requestId);
}

// =============================================================================
// HEAD - Resource Metadata
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const [totalGoals, activeGoals] = await Promise.all([
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: GoalStatus.ACTIVE } }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Goals', String(totalGoals));
    response.headers.set('X-Active-Goals', String(activeGoals));
    response.headers.set('X-Max-Import-Size', String(MAX_IMPORT_SIZE));
    response.headers.set('X-Max-Active-Goals', String(MAX_ACTIVE_GOALS));
    response.headers.set('X-Supported-Formats', 'json,csv');

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /api/goals/import failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// POST - Import Goals
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateRequest(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = apiResponse.validationError(
        'Invalid JSON body',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const validation = importBodySchema.safeParse(body);

    if (!validation.success) {
      const response = apiResponse.validationError(
        'Invalid import data',
        validation.error.errors,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    const params = validation.data;

    // Parse goals from data
    let goalsToImport: z.infer<typeof importGoalSchema>[] = [];

    if (params.goals && params.goals.length > 0) {
      goalsToImport = params.goals;
    } else if (params.data) {
      if (params.format === 'csv') {
        // Parse CSV
        const parsedRows = parseCSV(params.data);
        
        for (const row of parsedRows) {
          const goalValidation = importGoalSchema.safeParse(row);
          if (goalValidation.success) {
            goalsToImport.push(goalValidation.data);
          }
        }
      } else {
        // Parse JSON
        try {
          const jsonData = JSON.parse(params.data);
          const goalsArray = Array.isArray(jsonData) 
            ? jsonData 
            : jsonData.goals 
              ? jsonData.goals 
              : [jsonData];
          
          for (const goal of goalsArray) {
            const goalValidation = importGoalSchema.safeParse(goal);
            if (goalValidation.success) {
              goalsToImport.push(goalValidation.data);
            }
          }
        } catch (parseError) {
          const response = apiResponse.validationError(
            'Invalid JSON data format',
            undefined,
            requestId
          );
          return addHeaders(response, requestId, rateLimitResult);
        }
      }
    }

    if (goalsToImport.length === 0) {
      const response = apiResponse.validationError(
        'No valid goals found to import',
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    if (goalsToImport.length > MAX_IMPORT_SIZE) {
      const response = apiResponse.validationError(
        `Maximum ${MAX_IMPORT_SIZE} goals can be imported at once. Found ${goalsToImport.length} goals.`,
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Check active goals limit
    const currentActiveGoals = await prisma.goal.count({
      where: { userId, status: GoalStatus.ACTIVE },
    });

    const newActiveGoals = params.setActive ? goalsToImport.length : 0;
    if (currentActiveGoals + newActiveGoals > MAX_ACTIVE_GOALS) {
      const response = apiResponse.validationError(
        `Importing would exceed maximum active goals limit (${MAX_ACTIVE_GOALS}). Current: ${currentActiveGoals}, New: ${newActiveGoals}`,
        undefined,
        requestId
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Check for duplicates
    const existingGoals = await prisma.goal.findMany({
      where: {
        userId,
        title: { in: goalsToImport.map((g) => g.title) },
        status: { not: GoalStatus.ARCHIVED },
      },
      select: { id: true, title: true },
    });

    const existingTitlesMap = new Map(existingGoals.map((g) => [g.title.toLowerCase(), g.id]));

    // Filter and prepare goals
    const validGoals: z.infer<typeof importGoalSchema>[] = [];
    const duplicates: { title: string; existingId: string }[] = [];
    const skipped: { title: string; reason: string }[] = [];

    for (const goal of goalsToImport) {
      const existingId = existingTitlesMap.get(goal.title.toLowerCase());
      
      if (existingId) {
        if (params.skipDuplicates) {
          duplicates.push({ title: goal.title, existingId });
          continue;
        } else if (!params.overwriteExisting) {
          skipped.push({ title: goal.title, reason: 'Duplicate title exists' });
          continue;
        }
      }

      validGoals.push(goal);
    }

    // Dry run - validate without creating
    if (params.dryRun) {
      logger.info('POST /api/goals/import dry run completed', {
        userId,
        valid: validGoals.length,
        duplicates: duplicates.length,
        skipped: skipped.length,
        requestId,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(
        {
          dryRun: true,
          valid: validGoals.length,
          duplicates: duplicates.length,
          skipped: skipped.length,
          preview: validGoals.slice(0, 10).map((g) => ({
            title: g.title,
            target: g.target,
            category: g.category,
            goalType: g.goalType,
          })),
          duplicatesList: duplicates,
          skippedList: skipped,
          message: `${validGoals.length} goals ready to import`,
        },
        { meta: { requestId } }
      );
      return addHeaders(response, requestId, rateLimitResult);
    }

    // Import goals
    const results = {
      success: [] as { id: string; title: string }[],
      failed: [] as { title: string; error: string }[],
      updated: [] as { id: string; title: string }[],
    };

    const now = new Date();

    for (const goalData of validGoals) {
      try {
        const existingId = existingTitlesMap.get(goalData.title.toLowerCase());
        const startDate = goalData.startDate ? new Date(goalData.startDate) : now;
        const deadline = goalData.deadline 
          ? new Date(goalData.deadline) 
          : calculateDeadline(goalData.goalType || GoalType.CUSTOM, startDate);

        const progress = goalData.progress || 0;
        const progressPercentage = goalData.target > 0 
          ? Math.min(100, Math.round((progress / goalData.target) * 100 * 10) / 10)
          : 0;

        const goalDataForDB: Prisma.GoalCreateInput = {
          user: { connect: { id: userId } },
          title: goalData.title,
          description: goalData.description || null,
          category: goalData.category,
          goalType: goalData.goalType || GoalType.CUSTOM,
          metric: goalData.metric || GoalMetric.CUSTOM,
          customMetric: goalData.customMetric || null,
          target: goalData.target,
          progress,
          progressPercentage,
          unit: goalData.unit || null,
          startDate,
          deadline,
          status: params.setActive ? GoalStatus.ACTIVE : GoalStatus.DRAFT,
          isPublic: goalData.isPublic || false,
          shareCode: goalData.isPublic ? generateShareCode() : null,
          color: goalData.color || null,
          icon: goalData.icon || null,
          reminderEnabled: goalData.reminderEnabled || false,
          milestones: [
            { value: 25, label: '25%', reached: progressPercentage >= 25 },
            { value: 50, label: '50%', reached: progressPercentage >= 50 },
            { value: 75, label: '75%', reached: progressPercentage >= 75 },
            { value: 100, label: '100%', reached: progressPercentage >= 100 },
          ],
          daysActive: 0,
          avgDailyProgress: 0,
          currentStreakDays: 0,
        };

        if (existingId && params.overwriteExisting) {
          // Update existing goal
          const goal = await prisma.goal.update({
            where: { id: existingId },
            data: {
              ...goalDataForDB,
              user: undefined,
              updatedAt: now,
            },
          });
          results.updated.push({ id: goal.id, title: goal.title });
        } else {
          // Create new goal
          const goal = await prisma.goal.create({
            data: goalDataForDB,
          });
          results.success.push({ id: goal.id, title: goal.title });
        }
      } catch (createError) {
        results.failed.push({
          title: goalData.title,
          error: createError instanceof Error ? createError.message : 'Unknown error',
        });
      }
    }

    // Create audit log
    await auditLogService.create({
      userId,
      action: 'CREATE',
      category: 'goals',
      entityType: 'goal',
      description: `Imported ${results.success.length} goals, updated ${results.updated.length}, failed ${results.failed.length}`,
      newValue: {
        format: params.format,
        imported: results.success.length,
        updated: results.updated.length,
        failed: results.failed.length,
        skipped: duplicates.length + skipped.length,
      },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      requestId,
    });

    logger.info('POST /api/goals/import completed', {
      userId,
      imported: results.success.length,
      updated: results.updated.length,
      failed: results.failed.length,
      skipped: duplicates.length + skipped.length,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        imported: results.success.length,
        updated: results.updated.length,
        failed: results.failed.length,
        skipped: duplicates.length + skipped.length,
        results: {
          success: results.success,
          updated: results.updated,
          failed: results.failed,
          duplicates,
          skipped,
        },
        message: `Successfully imported ${results.success.length} goals${results.updated.length > 0 ? `, updated ${results.updated.length}` : ''}`,
      },
      { meta: { requestId } }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /api/goals/import failed', { requestId }, error);
    const response = apiResponse.internalError('Failed to import goals', requestId);
    return addHeaders(response, requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';