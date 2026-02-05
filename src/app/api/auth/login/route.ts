// src/app/api/auth/login/route.ts
// Direct login with email and password (returns JWT tokens)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { signJwt } from '@/lib/jwt';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';


// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 300;
const MAX_PAYLOAD_SIZE = 2048;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// =============================================================================
// SCHEMAS
// =============================================================================

const LoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128),
  rememberMe: z.boolean().optional().default(false),
  deviceId: z.string().optional(),
});

// =============================================================================
// TYPES
// =============================================================================

interface DeviceInfo {
  userAgent: string | null;
  ip: string;
  device: string | null;
  browser: string | null;
  os: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function parseUserAgent(userAgent: string | null): Partial<DeviceInfo> {
  if (!userAgent) return {};
  
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  
  let browser = 'Unknown';
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) os = 'iOS';
  
  return {
    device: isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop',
    browser,
    os,
  };
}

async function constantTimeDelay(start: number): Promise<void> {
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, CONSTANT_TIME_MS - elapsed);
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function secureResponse(body: object, status: number, requestId: string): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set('X-Request-ID', requestId);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  return res;
}

async function recordLoginAttempt(
  email: string,
  userId: string | null,
  success: boolean,
  failureReason: string | null,
  deviceInfo: DeviceInfo,
  twoFactorRequired: boolean = false
): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        userId,
        email,
        success,
        failureReason,
        ipAddress: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        twoFactorRequired,
        twoFactorPassed: false,
      },
    });
  } catch (error) {
    logger.error('Failed to record login attempt', { email }, error);
  }
}

async function checkAccountLockout(email: string): Promise<{
  locked: boolean;
  remainingMs: number;
  attempts: number;
}> {
  const windowStart = new Date(Date.now() - LOCKOUT_DURATION_MS);
  
  const recentAttempts = await prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: windowStart },
    },
  });
  
  if (recentAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lastAttempt = await prisma.loginAttempt.findFirst({
      where: { email, success: false },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    
    if (lastAttempt) {
      const lockoutEnd = lastAttempt.createdAt.getTime() + LOCKOUT_DURATION_MS;
      const remainingMs = lockoutEnd - Date.now();
      
      if (remainingMs > 0) {
        return { locked: true, remainingMs, attempts: recentAttempts };
      }
    }
  }
  
  return { locked: false, remainingMs: 0, attempts: recentAttempts };
}

// =============================================================================
// POST - Login
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');
  
  const deviceInfo: DeviceInfo = {
    userAgent,
    ip: clientIP,
    ...parseUserAgent(userAgent),
  };

  try {
    // Rate limiting
    const rateLimitKey = `login:${clientIP}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 10, rateLimitKey);
    
    if (!rateLimitResult.success) {
      logger.warn('Login rate limit exceeded', { ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { 
          success: false, 
          error: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        429,
        requestId
      );
    }

    // Content-Type validation
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse(
        { success: false, error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' },
        415,
        requestId
      );
    }

    // Parse and validate body
    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_SIZE) {
      return secureResponse(
        { success: false, error: 'Request payload too large', code: 'PAYLOAD_TOO_LARGE' },
        413,
        requestId
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return secureResponse(
        { success: false, error: 'Invalid JSON payload', code: 'INVALID_JSON' },
        400,
        requestId
      );
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      logger.debug('Login validation failed', { errors: parsed.error.flatten(), requestId });
      return secureResponse(
        { 
          success: false, 
          error: 'Invalid credentials format',
          code: 'VALIDATION_ERROR',
        },
        400,
        requestId
      );
    }

    const { email, password, rememberMe, deviceId } = parsed.data;

    // Check account lockout
    const lockoutStatus = await checkAccountLockout(email);
    if (lockoutStatus.locked) {
      const remainingMinutes = Math.ceil(lockoutStatus.remainingMs / 60000);
      logger.warn('Account locked due to failed attempts', { email, attempts: lockoutStatus.attempts, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        {
          success: false,
          error: `Account temporarily locked. Try again in ${remainingMinutes} minutes.`,
          code: 'ACCOUNT_LOCKED',
          retryAfter: Math.ceil(lockoutStatus.remainingMs / 1000),
        },
        423,
        requestId
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        username: true,
        image: true,
        role: true,
        isAdmin: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        emailVerified: true,
        deletedAt: true,
        twoFactorAuth: {
          select: {
            isEnabled: true,
          },
        },
      },
    });

    // User not found - use constant time to prevent enumeration
    if (!user || !user.password) {
      await recordLoginAttempt(email, null, false, 'user_not_found', deviceInfo);
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        401,
        requestId
      );
    }

    // Check account status
    if (user.deletedAt) {
      await recordLoginAttempt(email, user.id, false, 'account_deleted', deviceInfo);
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'This account has been deleted', code: 'ACCOUNT_DELETED' },
        401,
        requestId
      );
    }

    if (!user.isActive) {
      await recordLoginAttempt(email, user.id, false, 'account_inactive', deviceInfo);
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'This account is deactivated', code: 'ACCOUNT_INACTIVE' },
        401,
        requestId
      );
    }

    if (user.isBanned) {
      await recordLoginAttempt(email, user.id, false, 'account_banned', deviceInfo);
      await constantTimeDelay(start);
      return secureResponse(
        { 
          success: false, 
          error: `Account suspended: ${user.banReason || 'Policy violation'}`,
          code: 'ACCOUNT_BANNED',
        },
        403,
        requestId
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await recordLoginAttempt(email, user.id, false, 'invalid_password', deviceInfo);
      logger.info('Invalid password attempt', { userId: user.id, ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        401,
        requestId
      );
    }

    // Check 2FA requirement
    if (user.twoFactorAuth?.isEnabled) {
      // Generate a temporary token for 2FA verification
      const twoFactorToken = crypto.randomBytes(32).toString('hex');
      const twoFactorTokenHash = hashToken(twoFactorToken);
      
      // Store temporary token (expires in 5 minutes)
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: twoFactorTokenHash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
        },
      });

      await recordLoginAttempt(email, user.id, false, null, deviceInfo, true);
      await constantTimeDelay(start);
      
      return secureResponse(
        {
          success: false,
          requiresTwoFactor: true,
          twoFactorToken,
          message: 'Two-factor authentication required',
          code: 'TWO_FACTOR_REQUIRED',
        },
        200,
        requestId
      );
    }

    // Generate tokens
    const accessToken = signJwt({
      userId: user.id,
      email: user.email!,
      role: user.role,
    });

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);
    const tokenFamily = crypto.randomBytes(16).toString('hex');
    const refreshExpiresAt = new Date(
      Date.now() + (rememberMe ? REFRESH_TOKEN_EXPIRY_DAYS : 7) * 24 * 60 * 60 * 1000
    );

    // Create session and refresh token in transaction
    await prisma.$transaction(async (tx) => {
      // Create refresh token
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenHash,
          family: tokenFamily,
          deviceId,
          expiresAt: refreshExpiresAt,
          isValid: true,
        },
      });

      // Create active session
      await tx.activeSession.create({
        data: {
          userId: user.id,
          token: crypto.randomBytes(32).toString('hex'),
          userAgent,
          ipAddress: clientIP,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          isValid: true,
          isCurrent: true,
          expiresAt: refreshExpiresAt,
          lastActiveAt: new Date(),
        },
      });

      // Update user login timestamp
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          category: 'auth',
          entityType: 'user',
          entityId: user.id,
          description: 'User logged in successfully',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
        },
      });
    });

    // Record successful login
    await recordLoginAttempt(email, user.id, true, null, deviceInfo);

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      ip: clientIP,
      requestId,
    });

    await constantTimeDelay(start);

    return secureResponse(
      {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
          role: user.role,
          isAdmin: user.isAdmin,
          emailVerified: !!user.emailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresAt: refreshExpiresAt.toISOString(),
        },
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Login error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'An error occurred during login', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// OTHER METHODS - Not Allowed
// =============================================================================

export async function GET(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PUT(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PATCH(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function DELETE(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Max-Age', '86400');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

// =============================================================================
// ROUTE CONFIG
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';