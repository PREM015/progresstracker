// src/app/api/auth/change-email/route.ts
// Request email change (requires verification of both old and new email)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import crypto from 'crypto';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import { emailService } from '@/lib/email';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 250;
const MAX_PAYLOAD_SIZE = 1024;
const TOKEN_EXPIRY_HOURS = 1;

// Disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
  'yopmail.com', 'trashmail.com', 'getairmail.com', 'mohmal.com',
]);

// =============================================================================
// SCHEMAS
// =============================================================================

const ChangeEmailSchema = z.object({
  newEmail: z
    .string()
    .email('Invalid email format')
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128),
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

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

// =============================================================================
// POST - Request Email Change
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');

  try {
    // Get session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        401,
        requestId
      );
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `change-email:${userId}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 3, rateLimitKey);

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

    const parsed = ChangeEmailSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return secureResponse(
        { success: false, error: 'Validation failed', code: 'VALIDATION_ERROR', details: errors },
        400,
        requestId
      );
    }

    const { newEmail, password } = parsed.data;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        isActive: true,
        isBanned: true,
      },
    });

    if (!user || !user.isActive || user.isBanned) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Account not found or inactive', code: 'ACCOUNT_INACTIVE' },
        403,
        requestId
      );
    }

    // Check if user has password (OAuth users may not)
    if (!user.password) {
      return secureResponse(
        { success: false, error: 'Cannot change email for OAuth-only accounts. Please set a password first.', code: 'NO_PASSWORD' },
        400,
        requestId
      );
    }

    // Verify password
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn('Email change failed - invalid password', { userId, ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Incorrect password', code: 'INVALID_PASSWORD' },
        401,
        requestId
      );
    }

    // Check if same email
    if (user.email === newEmail) {
      return secureResponse(
        { success: false, error: 'New email must be different from current email', code: 'SAME_EMAIL' },
        400,
        requestId
      );
    }

    // Check for disposable email
    if (isDisposableEmail(newEmail)) {
      return secureResponse(
        { success: false, error: 'Disposable email addresses are not allowed', code: 'DISPOSABLE_EMAIL' },
        400,
        requestId
      );
    }

    // Check if new email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existingUser) {
      return secureResponse(
        { success: false, error: 'This email is already in use', code: 'EMAIL_EXISTS' },
        409,
        requestId
      );
    }

    // Check for pending email change requests
    const pendingRequest = await prisma.emailChangeRequest.findFirst({
      where: {
        userId,
        completedAt: null,
        cancelledAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingRequest) {
      // Cancel existing request
      await prisma.emailChangeRequest.update({
        where: { id: pendingRequest.id },
        data: { cancelledAt: new Date() },
      });
    }

    // Generate tokens
    const oldEmailToken = crypto.randomBytes(48).toString('hex');
    const newEmailToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Create email change request
    await prisma.emailChangeRequest.create({
      data: {
        userId,
        oldEmail: user.email!,
        newEmail,
        oldEmailToken: hashToken(oldEmailToken),
        newEmailToken: hashToken(newEmailToken),
        expiresAt,
      },
    });

    // Send confirmation emails
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Email to old address — confirm intent
    const oldEmailResult = await emailService.sendEmailChangeRequest(user.email!, {
      userName: user.name || 'there',
      currentEmail: user.email!,
      newEmail,
      verificationUrl: `${baseUrl}/auth/confirm-email-change?token=${oldEmailToken}&type=old`,
      expiresIn: `${TOKEN_EXPIRY_HOURS} hour(s)`,
      requestedAt: new Date().toISOString(),
      ipAddress: clientIP,
    });
    if (!oldEmailResult.success) {
      console.error(`[CHANGE-EMAIL] ❌ Failed to send old-email confirmation to ${user.email}:`, oldEmailResult.error);
      logger.error('Failed to send old email confirmation', { userId, requestId, error: oldEmailResult.error });
    }

    // Email to new address — confirm ownership
    const newEmailResult = await emailService.send({
      to: newEmail,
      subject: 'Confirm Your New Email Address',
      html: `<h2>Confirm Your New Email</h2><p>Hi ${user.name || 'there'},</p><p>Click to confirm: <a href="${baseUrl}/auth/confirm-email-change?token=${newEmailToken}&type=new">Confirm New Email</a></p><p>Expires in ${TOKEN_EXPIRY_HOURS} hour(s). If you did not request this, ignore this email.</p>`,
    });
    if (!newEmailResult.success) {
      console.error(`[CHANGE-EMAIL] ❌ Failed to send new-email confirmation to ${newEmail}:`, newEmailResult.error);
      logger.error('Failed to send new email confirmation', { userId, newEmail, requestId, error: newEmailResult.error });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'EMAIL_CHANGE',
        category: 'auth',
        entityType: 'user',
        entityId: userId,
        description: 'Email change requested',
        ipAddress: clientIP,
        userAgent: userAgent?.slice(0, 255),
        status: 'success',
        newValue: { newEmail },
      },
    });

    logger.info('Email change requested', {
      userId,
      oldEmail: user.email,
      newEmail,
      ip: clientIP,
      requestId,
    });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        message: 'Verification emails sent. Please check both your current and new email addresses.',
        expiresAt: expiresAt.toISOString(),
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Change email error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// GET - Get Pending Email Change Status
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        401,
        requestId
      );
    }

    const pendingRequest = await prisma.emailChangeRequest.findFirst({
      where: {
        userId: session.user.id,
        completedAt: null,
        cancelledAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        newEmail: true,
        oldEmailVerified: true,
        newEmailVerified: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        hasPendingRequest: !!pendingRequest,
        pendingRequest: pendingRequest ? {
          id: pendingRequest.id,
          newEmail: pendingRequest.newEmail,
          oldEmailVerified: pendingRequest.oldEmailVerified,
          newEmailVerified: pendingRequest.newEmailVerified,
          expiresAt: pendingRequest.expiresAt,
          createdAt: pendingRequest.createdAt,
        } : null,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Get email change status error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// DELETE - Cancel Pending Email Change
// =============================================================================

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        401,
        requestId
      );
    }

    const result = await prisma.emailChangeRequest.updateMany({
      where: {
        userId: session.user.id,
        completedAt: null,
        cancelledAt: null,
      },
      data: {
        cancelledAt: new Date(),
      },
    });

    logger.info('Email change cancelled', { userId: session.user.id, count: result.count, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        message: result.count > 0 ? 'Email change request cancelled' : 'No pending request found',
        cancelled: result.count,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Cancel email change error', { ip: clientIP, requestId }, error);
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

export async function PUT(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PATCH(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';