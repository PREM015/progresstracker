// src/app/api/auth/magic-link/route.ts
// Passwordless login via magic link

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import { emailService } from '@/lib/email';
import { signJwt } from '@/lib/jwt';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 300;
const MAX_PAYLOAD_SIZE = 1024;
const MAGIC_LINK_EXPIRY_MINUTES = 15;
const COOLDOWN_SECONDS = 60;

const GENERIC_SUCCESS = {
  success: true,
  message: 'If an account exists with that email, a magic link has been sent.',
};

// =============================================================================
// SCHEMAS
// =============================================================================

const RequestMagicLinkSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
});

const VerifyMagicLinkSchema = z.object({
  token: z
    .string()
    .min(64, 'Invalid token')
    .max(128, 'Invalid token'),
});

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

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function constantTimeDelay(start: number): Promise<void> {
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, CONSTANT_TIME_MS - elapsed);
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }
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

function parseUserAgent(userAgent: string | null): { device: string; browser: string; os: string } {
  if (!userAgent) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };

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

// =============================================================================
// POST - Request Magic Link
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');
  const deviceInfo = parseUserAgent(userAgent);

  logger.info('Magic link request received', { ip: clientIP, requestId });
  logger.debug('User agent', { userAgent, requestId });
  logger.debug('Device info', { deviceInfo, requestId });
  
  try {
    // Rate limiting
    const rateLimitKey = `magic-link:${clientIP}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 5, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
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

    // Parse body
    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_SIZE) {
      return secureResponse(
        { success: false, error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' },
        413,
        requestId
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return secureResponse(
        { success: false, error: 'Invalid JSON', code: 'INVALID_JSON' },
        400,
        requestId
      );
    }

    const parsed = RequestMagicLinkSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid email format', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { email } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        isBanned: true,
        deletedAt: true,
      },
    });

    // Return generic response if user doesn't exist
    if (!user || user.deletedAt || !user.isActive || user.isBanned) {
      logger.debug('Magic link requested for non-existent/inactive user', { email, requestId });
      await constantTimeDelay(start);
      return secureResponse(GENERIC_SUCCESS, 200, requestId);
    }

    // Check cooldown - look for recent email verification (reusing for magic links)
    const recentLink = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        type: 'magic_link',
        createdAt: { gte: new Date(Date.now() - COOLDOWN_SECONDS * 1000) },
      },
    });

    if (recentLink) {
      logger.info('Magic link cooldown active', { userId: user.id, requestId });
      await constantTimeDelay(start);
      return secureResponse(GENERIC_SUCCESS, 200, requestId);
    }

    // Generate magic link token
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate old magic links and create new one
    await prisma.$transaction([
      prisma.emailVerification.updateMany({
        where: {
          userId: user.id,
          type: 'magic_link',
          verifiedAt: null,
        },
        data: { expiresAt: new Date(0) },
      }),
      prisma.emailVerification.create({
        data: {
          userId: user.id,
          email: user.email!,
          token: tokenHash,
          expiresAt,
          type: 'magic_link',
        },
      }),
    ]);

    // Send magic link email
    const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic-link?token=${rawToken}`;

    const magicEmailResult = await emailService.send({
      to: email,
      subject: 'Your Magic Link to Sign In',
      html: `<h2>Sign In to ProgressTracker</h2><p>Hi ${user.name || 'there'},</p><p>Click to sign in (no password needed!): <a href="${magicLinkUrl}" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Sign In</a></p><p>Or copy: ${magicLinkUrl}</p><p>Expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes. IP: ${clientIP}</p>`,
    });
    if (!magicEmailResult.success) {
      console.error(`[MAGIC-LINK] ❌ Failed to send magic link to ${email}:`, magicEmailResult.error);
      logger.error('Failed to send magic link email', { userId: user.id, requestId, error: magicEmailResult.error });
    } else {
      console.log(`[MAGIC-LINK] ✅ Magic link sent to ${email}`);
    }

    logger.info('Magic link sent', { userId: user.id, email, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(GENERIC_SUCCESS, 200, requestId);

  } catch (error) {
    logger.error('Magic link request error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// PUT - Verify Magic Link and Login
// =============================================================================

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');
  const deviceInfo = parseUserAgent(userAgent);

  try {
    // Rate limiting
    const rateLimitKey = `magic-link-verify:${clientIP}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 10, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many attempts', code: 'RATE_LIMIT_EXCEEDED' },
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

    // Parse body
    const raw = await req.text();
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return secureResponse(
        { success: false, error: 'Invalid JSON', code: 'INVALID_JSON' },
        400,
        requestId
      );
    }

    const parsed = VerifyMagicLinkSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid token', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { token } = parsed.data;
    const tokenHash = hashToken(token);

    // Find magic link
    const magicLink = await prisma.emailVerification.findFirst({
      where: {
        token: tokenHash,
        type: 'magic_link',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            image: true,
            role: true,
            isAdmin: true,
            isActive: true,
            isBanned: true,
            emailVerified: true,
          },
        },
      },
    });

    // Validate
    if (!magicLink) {
      logger.warn('Invalid magic link token', { ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Invalid or expired magic link', code: 'INVALID_TOKEN' },
        401,
        requestId
      );
    }

    if (magicLink.verifiedAt) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'This magic link has already been used', code: 'TOKEN_USED' },
        401,
        requestId
      );
    }

    if (magicLink.expiresAt < new Date()) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'This magic link has expired', code: 'TOKEN_EXPIRED' },
        401,
        requestId
      );
    }

    const user = magicLink.user;

    if (!user || !user.isActive || user.isBanned) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Account not available', code: 'ACCOUNT_INACTIVE' },
        403,
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
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Complete login
    await prisma.$transaction(async (tx) => {
      // Mark magic link as used
      await tx.emailVerification.update({
        where: { id: magicLink.id },
        data: { verifiedAt: new Date(), verifiedIp: clientIP },
      });

      // Verify email if not already
      if (!user.emailVerified) {
        await tx.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date(), isVerified: true },
        });
      }

      // Create refresh token
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenHash,
          family: tokenFamily,
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

      // Update user
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
      });

      // Record login
      await tx.loginAttempt.create({
        data: {
          userId: user.id,
          email: user.email!,
          success: true,
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          category: 'auth',
          description: 'Logged in via magic link',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
        },
      });
    });

    logger.info('Magic link login successful', { userId: user.id, ip: clientIP, requestId });

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
    logger.error('Magic link verify error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// GET - Check Magic Link Status
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return secureResponse(
        { success: false, error: 'Token is required', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const tokenHash = hashToken(token);

    const magicLink = await prisma.emailVerification.findFirst({
      where: { token: tokenHash, type: 'magic_link' },
      select: {
        verifiedAt: true,
        expiresAt: true,
      },
    });

    if (!magicLink) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: true, valid: false, reason: 'not_found' },
        200,
        requestId
      );
    }

    if (magicLink.verifiedAt) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: true, valid: false, reason: 'already_used' },
        200,
        requestId
      );
    }

    if (magicLink.expiresAt < new Date()) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: true, valid: false, reason: 'expired' },
        200,
        requestId
      );
    }

    await constantTimeDelay(start);
    return secureResponse(
      { success: true, valid: true, expiresAt: magicLink.expiresAt },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Check magic link error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// OTHER METHODS
// =============================================================================

export async function PATCH(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function DELETE(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';