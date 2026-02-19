// src/app/api/user/route.ts
// =============================================================================
// USER API ROUTES - Complete, Secure, Modern Implementation
// Handles: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UserService } from '@/services/userService';
import { Prisma } from '@prisma/client';
import { sendEmail, emailTemplates } from '@/lib/email';


// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT_REQUESTS = 100;
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-API-Key, If-None-Match',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Vary': 'Authorization, Accept-Encoding',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Transform to convert null to undefined for service compatibility
 */
const nullToUndefined = <T>(val: T | null | undefined): T | undefined =>
  val === null ? undefined : val;

/**
 * Transform empty string to undefined
 */
const emptyToUndefined = (val: string | null | undefined): string | undefined =>
  val === '' || val === null ? undefined : val;

// Profile update schema (PUT - full update)
const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters')
    .optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    )
    .transform((val) => val.toLowerCase())
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .nullable()
    .transform(nullToUndefined),
  location: z
    .string()
    .max(100, 'Location must be less than 100 characters')
    .optional()
    .nullable()
    .transform(nullToUndefined),
  website: z
    .string()
    .url('Invalid website URL')
    .max(255, 'Website URL too long')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform(emptyToUndefined),
  company: z
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .optional()
    .nullable()
    .transform(nullToUndefined),
  jobTitle: z
    .string()
    .max(100, 'Job title must be less than 100 characters')
    .optional()
    .nullable()
    .transform(nullToUndefined),
  githubUsername: z
    .string()
    .max(39, 'GitHub username too long')
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, 'Invalid GitHub username')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform(emptyToUndefined),
  linkedinUrl: z
    .string()
    .url('Invalid LinkedIn URL')
    .regex(/linkedin\.com/, 'Must be a LinkedIn URL')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform(emptyToUndefined),
  twitterHandle: z
    .string()
    .max(15, 'Twitter handle too long')
    .regex(/^@?[a-zA-Z0-9_]*$/, 'Invalid Twitter handle')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => emptyToUndefined(val?.replace(/^@/, ''))),
  discordUsername: z
    .string()
    .max(32, 'Discord username too long')
    .optional()
    .nullable()
    .transform(nullToUndefined),
  timezone: z
    .string()
    .max(50, 'Timezone too long')
    .optional(),
  preferredLanguage: z
    .string()
    .length(2, 'Language code must be 2 characters')
    .optional(),
});

// Infer the type from schema for type safety
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Privacy update schema (PATCH)
const updatePrivacySchema = z.object({
  isPublic: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showGoals: z.boolean().optional(),
  showPlatforms: z.boolean().optional(),
  showStreak: z.boolean().optional(),
});

// Account creation schema (POST)
const createAccountSchema = z.object({
  action: z.enum(['complete_profile', 'generate_username', 'verify_email']),
  data: z.record(z.unknown()).optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get client IP address
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Safely convert a value to Date - prevents TS never issues
 */
function toDate(value: Date | string | number | null | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return new Date(value);
}

/**
 * Generate ETag from user data
 */
function generateETag(userId: string, updatedAt: Date | string | number | null | undefined): string {
  const timestamp = toDate(updatedAt).getTime();
  return `"${userId}-${timestamp}"`;
}

/**
 * Check if request is conditional and matches ETag (returns true if should return 304)
 */
function shouldReturn304(request: NextRequest, etag: string): boolean {
  const ifNoneMatch = request.headers.get('if-none-match');
  if (!ifNoneMatch) return false;

  // Handle multiple ETags (comma-separated)
  const clientEtags = ifNoneMatch.split(',').map((e) => e.trim().replace(/^W\//, ''));
  return clientEtags.includes(etag) || clientEtags.includes('*');
}

/**
 * Sanitize string input
 */
function sanitizeString(input: string | null | undefined): string | null {
  if (!input) return null;
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 1000);
}

/**
 * Add all standard headers (CORS + Security) to response
 */
function addStandardHeaders(response: NextResponse, requestId: string): NextResponse {
  // Add CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add request ID
  response.headers.set('X-Request-ID', requestId);

  return response;
}

/**
 * Create 304 Not Modified response
 */
function createNotModifiedResponse(requestId: string, etag: string): NextResponse {
  const response = new NextResponse(null, {
    status: 304,
    headers: { ETag: etag },
  });
  return addStandardHeaders(response, requestId);
}

/**
 * Validate session and rate limit
 */
async function validateRequest(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);

  // Get session first to use userId for rate limiting if available
  const session = await getServerSession(authOptions);

  // Rate limiting - use userId if authenticated, otherwise IP
  const rateLimitKey = session?.user?.id ?? ip;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT_REQUESTS, rateLimitKey);

  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded', {
      ip,
      userId: session?.user?.id,
      requestId,
      rateLimitKey,
    });
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  if (!session?.user?.id) {
    logger.warn('Unauthorized access attempt', { ip, requestId });
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  return { error: null, session, rateLimitResult, ip };
}

/**
 * Create audit log entry
 */
async function createAuditLog(
  userId: string,
  action: string,
  description: string,
  ip: string,
  userAgent: string | null,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: action as Prisma.AuditLogCreateInput['action'],
        category: 'user',
        entityType: 'user',
        entityId: userId,
        description,
        metadata: metadata as Prisma.InputJsonValue,
        ipAddress: ip,
        userAgent,
        status: 'success',
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', { userId, action, ip }, error);
  }
}

/**
 * Add rate limit headers to response options
 */
function getRateLimitHeaders(rateLimitResult: {
  limit: number;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(rateLimitResult.limit),
    'X-RateLimit-Remaining': String(rateLimitResult.remaining),
    'X-RateLimit-Reset': String(rateLimitResult.reset),
  };
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const ip = getClientIp(request);

  logger.debug('OPTIONS request', {
    path: request.url,
    requestId,
    ip,
    origin: request.headers.get('origin'),
  });

  const response = new NextResponse(null, { status: 204 });
  return addStandardHeaders(response, requestId);
}

// =============================================================================
// HEAD - Get Resource Metadata Without Body
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  let ip = 'unknown';

  try {
    const validation = await validateRequest(request, requestId);
    ip = validation.ip;

    if (validation.error) {
      return addStandardHeaders(validation.error, requestId);
    }

    const { session, rateLimitResult } = validation;

    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true,
        updatedAt: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      const response = new NextResponse(null, { status: 404 });
      return addStandardHeaders(response, requestId);
    }

    const etag = generateETag(user.id, user.updatedAt);

    // Check conditional request - return 304 if ETag matches
    if (shouldReturn304(request, etag)) {
      logger.debug('HEAD returning 304', { userId: user.id, requestId, ip });
      return createNotModifiedResponse(requestId, etag);
    }

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'Last-Modified': toDate(user.updatedAt).toUTCString(),
        ETag: etag,
        ...getRateLimitHeaders(rateLimitResult),
      },
    });

    logger.debug('HEAD request completed', {
      userId: user.id,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    return addStandardHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD request failed', { requestId, ip }, error);
    const response = new NextResponse(null, { status: 500 });
    return addStandardHeaders(response, requestId);
  }
}

// =============================================================================
// GET - Fetch User Profile
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  let ip = 'unknown';

  try {
    const validation = await validateRequest(request, requestId);
    ip = validation.ip;

    if (validation.error) {
      return addStandardHeaders(validation.error, requestId);
    }

    const { session, rateLimitResult } = validation;
    const userId = session!.user.id;

    logger.debug('Fetching user profile', { userId, requestId, ip });

    // Parse query params
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',').filter(Boolean) || [];

    // Build optional includes
    const includeRelations: Record<string, unknown> = {};

    if (include.includes('subscription')) {
      includeRelations.subscription = {
        select: {
          tier: true,
          status: true,
          currentPeriodEnd: true,
          features: true,
        },
      };
    }

    if (include.includes('settings')) {
      includeRelations.settings = true;
    }

    if (include.includes('notifications')) {
      includeRelations.notificationPrefs = true;
    }

    if (include.includes('stats')) {
      includeRelations._count = {
        select: {
          platforms: true,
          goals: true,
          achievements: true,
          trackerEntries: true,
        },
      };
    }

    // Single optimized query - includes isActive/isBanned for status check
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        bio: true,
        location: true,
        website: true,
        company: true,
        jobTitle: true,
        githubUsername: true,
        linkedinUrl: true,
        twitterHandle: true,
        discordUsername: true,
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
        isVerified: true,
        emailVerified: true,
        currentStreak: true,
        longestStreak: true,
        totalProblems: true,
        totalCommits: true,
        totalProjects: true,
        totalCertifications: true,
        totalAchievements: true,
        totalPoints: true,
        rank: true,
        preferredLanguage: true,
        timezone: true,
        referralCode: true,
        createdAt: true,
        lastActiveAt: true,
        updatedAt: true,
        // Include status fields in main query for optimization
        isActive: true,
        isBanned: true,
        banReason: true,
        ...includeRelations,
      },
    });

    if (!user) {
      logger.error('User not found', { userId, requestId, ip });
      return addStandardHeaders(apiResponse.notFound('User', requestId), requestId);
    }

    // Check account status
    if (!user.isActive) {
      logger.warn('Inactive account access attempt', { userId, requestId, ip });
      return addStandardHeaders(
        apiResponse.forbidden('Account is inactive', requestId),
        requestId
      );
    }

    if (user.isBanned) {
      logger.warn('Banned account access attempt', { userId, requestId, ip });
      return addStandardHeaders(
        apiResponse.forbidden(
          `Account is banned: ${user.banReason || 'No reason provided'}`,
          requestId
        ),
        requestId
      );
    }

    // Generate ETag for conditional requests
    const etag = generateETag(user.id, user.updatedAt);

    // Check conditional request - return 304 if ETag matches
    if (shouldReturn304(request, etag)) {
      logger.debug('GET returning 304', { userId, requestId, ip });
      return createNotModifiedResponse(requestId, etag);
    }

    // Update last active timestamp (non-blocking)
    prisma.user
      .update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      })
      .catch((err) => {
        logger.error('Failed to update last active', { userId, ip }, err);
      });

    // Remove internal status fields from response
    const { isActive, isBanned, banReason, ...publicUser } = user;
    if (!isActive) {
      if (isBanned) {
        logger.warn(`Banned: ${banReason}`);
        return addStandardHeaders(
          apiResponse.forbidden(`Account is banned: ${banReason || 'No reason provided'}`, requestId),
          requestId
        );
      }
    }


    const duration = Date.now() - startTime;

    logger.info('User profile fetched', {
      userId,
      requestId,
      ip,
      duration,
      includeRelations: Object.keys(includeRelations),
    });


    const response = apiResponse.success(publicUser, {
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
      headers: {
        ...getRateLimitHeaders(rateLimitResult),
        'Cache-Control': 'private, max-age=60',
        ETag: etag,
        'Last-Modified': toDate(user.updatedAt).toUTCString(),
      },
    });

    return addStandardHeaders(response, requestId);
  } catch (error) {
    logger.error('Failed to fetch user profile', { requestId, ip }, error);
    return addStandardHeaders(
      apiResponse.internalError('Failed to fetch user profile', requestId),
      requestId
    );
  }
}

// =============================================================================
// POST - Special Actions (Complete Profile, Generate Username, etc.)
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  let ip = 'unknown';

  try {
    const validation = await validateRequest(request, requestId);
    ip = validation.ip;

    if (validation.error) {
      return addStandardHeaders(validation.error, requestId);
    }

    const { session, rateLimitResult } = validation;
    const userId = session!.user.id;
    const userAgent = request.headers.get('user-agent');

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addStandardHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    const bodyValidation = createAccountSchema.safeParse(body);

    if (!bodyValidation.success) {
      logger.warn('Validation failed', {
        userId,
        requestId,
        ip,
        errors: bodyValidation.error.errors,
      });
      return addStandardHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId
      );
    }

    const { action, data } = bodyValidation.data;

    let result: unknown;

    switch (action) {
      case 'complete_profile': {
        const profileData = data as UpdateProfileInput;

        const profileValidation = updateProfileSchema.safeParse(profileData);

        if (!profileValidation.success) {
          return addStandardHeaders(
            apiResponse.validationError(
              'Invalid profile data',
              profileValidation.error.errors,
              requestId
            ),
            requestId
          );
        }

        // Type is now correctly inferred without null values
        result = await UserService.updateProfile(userId, profileValidation.data);

        await createAuditLog(userId, 'UPDATE', 'Profile completed', ip, userAgent, {
          fields: Object.keys(profileValidation.data),
        });
        break;
      }

      case 'generate_username': {
        const baseName = sanitizeString((data as { base?: string })?.base || '');

        if (!baseName || baseName.length < 2) {
          return addStandardHeaders(
            apiResponse.validationError(
              'Base name must be at least 2 characters',
              undefined,
              requestId
            ),
            requestId
          );
        }

        const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

        const suggestions: string[] = [];
        const variations = [
          cleanBase,
          `${cleanBase}_dev`,
          `${cleanBase}${Math.floor(Math.random() * 1000)}`,
          `the_${cleanBase}`,
          `${cleanBase}_codes`,
          `${cleanBase}${new Date().getFullYear() % 100}`,
        ];

        for (const variation of variations) {
          if (suggestions.length >= 5) break;
          if (variation.length < 3 || variation.length > 30) continue;

          const exists = await prisma.user.findUnique({
            where: { username: variation },
            select: { id: true },
          });

          if (!exists) {
            suggestions.push(variation);
          }
        }

        result = { suggestions };
        break;
      }

      case 'verify_email': {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, emailVerified: true, name: true, username: true },
        });

        if (user?.emailVerified) {
          return addStandardHeaders(
            apiResponse.validationError('Email already verified', undefined, requestId),
            requestId
          );
        }

        if (user && user.email) {
          try {
            // In a real production app, you would generate a secure token here
            // For now, we'll simulate it
            await sendEmail({
              to: user.email,
              ...emailTemplates.welcome(user.name || 'User', user.username || 'User'), // Using welcome as a placeholder for verification
              subject: 'Verify your email - CodeSync Pro',
            });
          } catch (error) {
            logger.error('Failed to send verification email', { userId, error });
            // Don't fail the request, just log it
          }
        }

        await createAuditLog(userId, 'UPDATE', 'Email verification requested', ip, userAgent);

        result = { message: 'Verification email sent' };
        break;
      }

      default:
        return addStandardHeaders(
          apiResponse.validationError(`Unknown action: ${action}`, undefined, requestId),
          requestId
        );
    }

    const duration = Date.now() - startTime;

    logger.info('POST action completed', {
      userId,
      action,
      requestId,
      ip,
      duration,
    });

    const response = apiResponse.success(result, {
      status: 200,
      meta: { requestId },
      headers: getRateLimitHeaders(rateLimitResult),
    });

    return addStandardHeaders(response, requestId);
  } catch (error) {
    logger.error('POST action failed', { requestId, ip }, error);

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return addStandardHeaders(
        apiResponse.validationError('Username or email already taken', undefined, requestId),
        requestId
      );
    }

    return addStandardHeaders(
      apiResponse.internalError('Failed to process request', requestId),
      requestId
    );
  }
}

// =============================================================================
// PUT - Full Profile Update
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  let ip = 'unknown';

  try {
    const validation = await validateRequest(request, requestId);
    ip = validation.ip;

    if (validation.error) {
      return addStandardHeaders(validation.error, requestId);
    }

    const { session, rateLimitResult } = validation;
    const userId = session!.user.id;
    const userAgent = request.headers.get('user-agent');

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addStandardHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    const bodyValidation = updateProfileSchema.safeParse(body);

    if (!bodyValidation.success) {
      logger.warn('Profile update validation failed', {
        userId,
        requestId,
        ip,
        errors: bodyValidation.error.errors,
      });
      return addStandardHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId
      );
    }

    const data: UpdateProfileInput = bodyValidation.data;


    logger.debug('Updating user profile', {
      userId,
      requestId,
      ip,
      fields: Object.keys(data),
    });

    // Check username uniqueness
    if (data.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (existingUser) {
        return addStandardHeaders(
          apiResponse.validationError('Username already taken', undefined, requestId),
          requestId
        );
      }
    }

    // Get current user data for audit log
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        username: true,
        bio: true,
        location: true,
        website: true,
        company: true,
        jobTitle: true,
        githubUsername: true,
        linkedinUrl: true,
        twitterHandle: true,
        discordUsername: true,
      },
    });

    // Sanitize text inputs and prepare data for database
    // Convert undefined back to null for nullable database fields
    const sanitizedData: Record<string, unknown> = {};

    if (data.name !== undefined) sanitizedData.name = data.name;
    if (data.username !== undefined) sanitizedData.username = data.username;
    if (data.timezone !== undefined) sanitizedData.timezone = data.timezone;
    if (data.preferredLanguage !== undefined) sanitizedData.preferredLanguage = data.preferredLanguage;

    // Nullable string fields - sanitize and convert to null for DB storage
    if (data.bio !== undefined) sanitizedData.bio = data.bio ? sanitizeString(data.bio) : null;
    if (data.location !== undefined) sanitizedData.location = data.location ? sanitizeString(data.location) : null;
    if (data.company !== undefined) sanitizedData.company = data.company ? sanitizeString(data.company) : null;
    if (data.jobTitle !== undefined) sanitizedData.jobTitle = data.jobTitle ? sanitizeString(data.jobTitle) : null;
    if (data.website !== undefined) sanitizedData.website = data.website || null;
    if (data.linkedinUrl !== undefined) sanitizedData.linkedinUrl = data.linkedinUrl || null;
    if (data.githubUsername !== undefined) sanitizedData.githubUsername = data.githubUsername || null;
    if (data.twitterHandle !== undefined) sanitizedData.twitterHandle = data.twitterHandle || null;
    if (data.discordUsername !== undefined) sanitizedData.discordUsername = data.discordUsername || null;

    // Update user - Prisma @updatedAt handles timestamp automatically
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: sanitizedData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        bio: true,
        location: true,
        website: true,
        company: true,
        jobTitle: true,
        githubUsername: true,
        linkedinUrl: true,
        twitterHandle: true,
        discordUsername: true,
        timezone: true,
        preferredLanguage: true,
        updatedAt: true,
      },
    });

    // Create audit log with changes
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const key of Object.keys(sanitizedData)) {
      const oldValue = currentUser?.[key as keyof typeof currentUser];
      const newValue = sanitizedData[key];
      if (oldValue !== newValue) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }

    await createAuditLog(userId, 'UPDATE', 'Profile updated', ip, userAgent, {
      changes,
      fieldsUpdated: Object.keys(changes),
    });

    const duration = Date.now() - startTime;

    logger.info('User profile updated', {
      userId,
      requestId,
      ip,
      duration,
      fieldsUpdated: Object.keys(changes),
    });

    const response = apiResponse.success(updatedUser, {
      meta: { requestId },
      message: 'Profile updated successfully',
      headers: getRateLimitHeaders(rateLimitResult),
    });

    return addStandardHeaders(response, requestId);
  } catch (error) {
    logger.error('Failed to update profile', { requestId, ip }, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return addStandardHeaders(
        apiResponse.validationError('Username or email already taken', undefined, requestId),
        requestId
      );
    }

    return addStandardHeaders(
      apiResponse.internalError('Failed to update profile', requestId),
      requestId
    );
  }
}

// =============================================================================
// PATCH - Partial Update (Privacy Settings, Individual Fields)
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  let ip = 'unknown';

  try {
    const validation = await validateRequest(request, requestId);
    ip = validation.ip;

    if (validation.error) {
      return addStandardHeaders(validation.error, requestId);
    }

    const { session, rateLimitResult } = validation;
    const userId = session!.user.id;
    const userAgent = request.headers.get('user-agent');

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addStandardHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    // Determine if this is a privacy update or profile update
    const bodyObj = body as Record<string, unknown>;
    const privacyFields = [
      'isPublic',
      'showEmail',
      'showLocation',
      'showActivity',
      'showAchievements',
      'showGoals',
      'showPlatforms',
      'showStreak',
    ];
    const isPrivacyUpdate = Object.keys(bodyObj).some((key) => privacyFields.includes(key));

    const bodyValidation = isPrivacyUpdate
      ? updatePrivacySchema.safeParse(body)
      : updateProfileSchema.partial().safeParse(body);

    if (!bodyValidation.success) {
      logger.warn('PATCH validation failed', {
        userId,
        requestId,
        ip,
        errors: bodyValidation.error.errors,
      });
      return addStandardHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId
      );
    }

    const data = bodyValidation.data;

    logger.debug('Patching user', {
      userId,
      requestId,
      ip,
      isPrivacyUpdate,
      fields: Object.keys(data),
    });

    // Get current values for audit
    const selectFields = isPrivacyUpdate
      ? {
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
      }
      : {
        name: true,
        username: true,
        bio: true,
        location: true,
      };

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: selectFields,
    });

    // Update user - Prisma @updatedAt handles timestamp automatically
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        bio: true,
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
        updatedAt: true,
      },
    });

    // Audit log
    await createAuditLog(
      userId,
      isPrivacyUpdate ? 'SETTINGS_CHANGE' : 'UPDATE',
      isPrivacyUpdate ? 'Privacy settings updated' : 'Profile partially updated',
      ip,
      userAgent,
      {
        type: isPrivacyUpdate ? 'privacy' : 'profile',
        fields: Object.keys(data),
        previousValues: currentUser,
      }
    );

    const duration = Date.now() - startTime;

    logger.info('User patched', {
      userId,
      requestId,
      ip,
      duration,
      isPrivacyUpdate,
      fieldsUpdated: Object.keys(data),
    });

    const response = apiResponse.success(updatedUser, {
      meta: { requestId },
      headers: getRateLimitHeaders(rateLimitResult),
    });

    return addStandardHeaders(response, requestId);
  } catch (error) {
    logger.error('PATCH failed', { requestId, ip }, error);
    return addStandardHeaders(
      apiResponse.internalError('Failed to update user', requestId),
      requestId
    );
  }
}

// =============================================================================
// DELETE - Deactivate Account (Soft Delete)
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  let ip = 'unknown';

  try {
    const validation = await validateRequest(request, requestId);
    ip = validation.ip;

    if (validation.error) {
      return addStandardHeaders(validation.error, requestId);
    }

    const { session, rateLimitResult } = validation;
    const userId = session!.user.id;
    const userAgent = request.headers.get('user-agent');

    logger.warn('Account deactivation requested', { userId, requestId, ip });

    // Check for query param to determine action
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'deactivate') {
      // Soft deactivate - Prisma @updatedAt handles timestamp automatically
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      await createAuditLog(userId, 'UPDATE', 'Account deactivated', ip, userAgent);

      // Invalidate all active sessions
      await prisma.activeSession.updateMany({
        where: { userId },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'account_deactivated',
        },
      });

      logger.info('Account deactivated', {
        userId,
        requestId,
        ip,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(
        { message: 'Account deactivated successfully' },
        {
          meta: { requestId },
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );

      return addStandardHeaders(response, requestId);
    }

    // Default: Return info about deletion options
    const response = apiResponse.success(
      {
        message: 'Use POST /api/user/delete for permanent deletion with password confirmation',
        options: {
          deactivate: 'Add ?action=deactivate to temporarily deactivate account',
          delete: 'POST to /api/user/delete with password for permanent deletion',
        },
      },
      {
        meta: { requestId },
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );

    return addStandardHeaders(response, requestId);
  } catch (error) {
    logger.error('DELETE failed', { requestId, ip }, error);
    return addStandardHeaders(
      apiResponse.internalError('Failed to process request', requestId),
      requestId
    );
  }
}

// =============================================================================
// EXPORTS & CONFIG
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';