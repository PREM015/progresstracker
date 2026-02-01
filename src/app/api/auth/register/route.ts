// src/app/api/auth/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';


// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(5, 'Email is too short')
    .max(255, 'Email is too long')
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/,
      'Password must contain at least one special character'
    ),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .transform((val) => val.trim())
    .optional(),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username is too long')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    )
    .transform((val) => val.toLowerCase().trim())
    .optional(),

  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),

  signupSource: z.string().optional(),
  referralCode: z.string().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

function generateVerificationToken(): string {
  return nanoid(32);
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

async function sendVerificationEmail(
  email: string,
  name: string | null,
  token: string
): Promise<boolean> {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  // TODO: Replace with actual email sending (Resend, SendGrid, etc.)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Verification email (DEV ONLY)', {
      to: email,
      name: name || 'User',
      verificationUrl,
    });
  }

  return true;
}

// =============================================================================
// POST - Register new user
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);

  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    logger.debug('Registration attempt', {
      email: validatedData.email,
      ip: clientIP,
    });

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: { id: true },
    });

    if (existingEmail) {
      logger.info('Registration failed - email exists', {
        email: validatedData.email,
        ip: clientIP,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists',
          code: 'EMAIL_EXISTS',
        },
        { status: 409 }
      );
    }

    // Check if username already exists
    if (validatedData.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: validatedData.username },
        select: { id: true },
      });

      if (existingUsername) {
        logger.info('Registration failed - username exists', {
          username: validatedData.username,
          ip: clientIP,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'This username is already taken',
            code: 'USERNAME_EXISTS',
          },
          { status: 409 }
        );
      }
    }

    // Validate referral code if provided
    let referrerId: string | null = null;
    if (validatedData.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: validatedData.referralCode },
        select: { id: true },
      });

      if (referrer) {
        referrerId = referrer.id;
        logger.debug('Valid referral code used', {
          referralCode: validatedData.referralCode,
          referrerId,
        });
      }
    }


    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Generate codes/tokens
    const newReferralCode = generateReferralCode();
    const verificationToken = generateVerificationToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name || validatedData.email.split('@')[0],
          username: validatedData.username,
          referralCode: newReferralCode,
          referredBy: referrerId,
          signupSource: validatedData.signupSource || 'organic',
          isActive: true,
          isVerified: false,
          emailVerified: null,
          // Initialize streak data
          currentStreak: 0,
          longestStreak: 0,
          streakFreezeCount: 0,
          // Initialize stats
          totalProblems: 0,
          totalCommits: 0,
          totalProjects: 0,
          totalCertifications: 0,
          totalAchievements: 0,
          totalPoints: 0,
          // Defaults
          role: 'user',
          isAdmin: false,
          isPublic: false,
          preferredLanguage: 'en',
          timezone: 'UTC',
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
          email: validatedData.email,
          token: verificationToken,
          expiresAt: verificationExpiry,
          type: 'verification',
        },
      });

      // Create default user settings
      await tx.userSettings.create({
        data: {
          userId: newUser.id,
        },
      });

      // Create notification preferences
      await tx.notificationPreferences.create({
        data: {
          userId: newUser.id,
        },
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
          userAgent: request.headers.get('user-agent')?.slice(0, 255),
          newValue: {
            email: newUser.email,
            signupSource: validatedData.signupSource || 'organic',
            hasReferrer: !!referrerId,
          },
        },
      });

      return newUser;
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(user.email!, user.name, verificationToken).catch((err) => {
      logger.error('Failed to send verification email', { userId: user.id }, err);
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      ip: clientIP,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
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
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Registration validation failed', {
        errors: error.errors,
        ip: clientIP,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      if (error.message.includes('email')) {
        return NextResponse.json(
          {
            success: false,
            error: 'An account with this email already exists',
            code: 'EMAIL_EXISTS',
          },
          { status: 409 }
        );
      }
      if (error.message.includes('username')) {
        return NextResponse.json(
          {
            success: false,
            error: 'This username is already taken',
            code: 'USERNAME_EXISTS',
          },
          { status: 409 }
        );
      }
    }

    logger.error('Registration error', { ip: clientIP }, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create account. Please try again.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}