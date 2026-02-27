// src/app/api/auth/register/route.ts
// Register new user account

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 300;
const MAX_PAYLOAD_SIZE = 4096;
const BCRYPT_ROUNDS = 12;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'info',
  'contact', 'api', 'www', 'mail', 'email', 'account', 'accounts',
  'dashboard', 'settings', 'profile', 'user', 'users', 'login', 'logout',
  'register', 'signup', 'signin', 'auth', 'oauth', 'callback', 'webhook',
  'webhooks', 'null', 'undefined', 'true', 'false', 'test', 'demo',
]);

// Common password patterns to reject
const COMMON_PASSWORDS = new Set([
  'password123', 'Password123!', 'Qwerty123!', 'Admin123!', '12345678',
  'password1', 'qwerty123', 'letmein123', 'welcome123', 'monkey123',
]);

// =============================================================================
// SCHEMAS
// =============================================================================

const RegisterSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(5, 'Email is too short')
    .max(255, 'Email is too long')
    .transform((e) => e.toLowerCase().trim()),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .transform((n) => n.trim())
    .optional(),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username is too long')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    )
    .transform((u) => u.toLowerCase().trim())
    .optional(),

  acceptTerms: z
    .boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions'),

  referralCode: z.string().max(20).optional(),
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

function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
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
  const disposableDomains = [
    'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
    '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
  ];
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
}

// =============================================================================
// POST - Register
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitKey = `register:${clientIP}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 5, rateLimitKey);

    if (!rateLimitResult.success) {
      logger.warn('Registration rate limit exceeded', { ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        {
          success: false,
          error: 'Too many registration attempts. Please try again later.',
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

    // Parse body
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

    // Validate schema
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return secureResponse(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
        400,
        requestId
      );
    }

    const { email, password, name, username, referralCode } = parsed.data;

    // Check for disposable email
    if (isDisposableEmail(email)) {
      return secureResponse(
        {
          success: false,
          error: 'Disposable email addresses are not allowed',
          code: 'DISPOSABLE_EMAIL',
        },
        400,
        requestId
      );
    }

    // Check for common passwords
    if (COMMON_PASSWORDS.has(password)) {
      return secureResponse(
        {
          success: false,
          error: 'This password is too common. Please choose a stronger password.',
          code: 'WEAK_PASSWORD',
        },
        400,
        requestId
      );
    }

    // Check reserved username
    if (username && RESERVED_USERNAMES.has(username)) {
      return secureResponse(
        {
          success: false,
          error: 'This username is reserved',
          code: 'RESERVED_USERNAME',
        },
        400,
        requestId
      );
    }

    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      logger.info('Registration failed - email exists', { email, ip: clientIP, requestId });
      // Use constant time to prevent email enumeration
      await constantTimeDelay(start);
      return secureResponse(
        {
          success: false,
          error: 'An account with this email already exists',
          code: 'EMAIL_EXISTS',
        },
        409,
        requestId
      );
    }

    // Check if username exists
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (existingUsername) {
        return secureResponse(
          {
            success: false,
            error: 'This username is already taken',
            code: 'USERNAME_EXISTS',
          },
          409,
          requestId
        );
      }
    }

    // Validate referral code
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      });

      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Generate codes
    const newReferralCode = generateReferralCode();
    const verificationToken = generateVerificationToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Create user in transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split('@')[0],
          username,
          referralCode: newReferralCode,
          referredBy: referrerId,
          signupSource: 'organic',
          isActive: true,
          isVerified: false,
          emailVerified: null,
          role: 'user',
          isAdmin: false,
          isPublic: false,
          preferredLanguage: 'en',
          timezone: 'UTC',
          currentStreak: 0,
          longestStreak: 0,
          streakFreezeCount: 0,
          totalProblems: 0,
          totalCommits: 0,
          totalProjects: 0,
          totalCertifications: 0,
          totalAchievements: 0,
          totalPoints: 0,
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          referralCode: true,
          createdAt: true,
        },
      });

      // Create email verification record
      await tx.emailVerification.create({
        data: {
          userId: newUser.id,
          email,
          token: verificationTokenHash,
          expiresAt: verificationExpiry,
          type: 'verification',
        },
      });

      // Create default user settings
      await tx.userSettings.create({
        data: { userId: newUser.id },
      });

      // Create notification preferences
      await tx.notificationPreferences.create({
        data: { userId: newUser.id },
      });

      // Create free subscription
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          tier: 'FREE',
          status: 'ACTIVE',
          billingInterval: 'MONTHLY',
          currency: 'usd',
          platformLimit: 5,
          syncFrequencyMinutes: 1440,
          exportLimitMonthly: 3,
          apiRequestsDaily: 100,
          currentPlatformCount: 0,
          currentExportCount: 0,
          features: ['basic_tracking', 'manual_sync'],
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: 'CREATE',
          category: 'auth',
          entityType: 'user',
          entityId: newUser.id,
          description: 'User account created',
          status: 'success',
          ipAddress: clientIP,
          userAgent: req.headers.get('user-agent')?.slice(0, 255),
          newValue: {
            email: newUser.email,
            signupSource: 'organic',
            hasReferrer: !!referrerId,
          },
        },
      });

      return newUser;
    });

    // Send verification email (non-blocking)
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;
    sendEmail({
      to: email,
      subject: 'Verify your email address',
      html: `
        <h1>Welcome to CodeSync!</h1>
        <p>Hi ${user.name},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>This link will expire in ${VERIFICATION_TOKEN_EXPIRY_HOURS} hours.</p>
        <p>If you didn't create this account, you can safely ignore this email.</p>
      `,
    }).catch((err) => {
      logger.error('Failed to send verification email', { userId: user.id, requestId }, err);
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      ip: clientIP,
      requestId,
      duration: Date.now() - start,
    });

    await constantTimeDelay(start);

    return secureResponse(
      {
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          referralCode: user.referralCode,
        },
        requiresVerification: true,
      },
      201,
      requestId
    );

  } catch (error) {
    logger.error('Registration error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      {
        success: false,
        error: 'Failed to create account. Please try again.',
        code: 'INTERNAL_ERROR',
      },
      500,
      requestId
    );
  }
}

// =============================================================================
// OTHER METHODS
// =============================================================================

export async function GET(): Promise<NextResponse> {
  return secureResponse(
    { error: 'Method not allowed. Use POST to register.', code: 'METHOD_NOT_ALLOWED' },
    405,
    generateRequestId()
  );
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
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';