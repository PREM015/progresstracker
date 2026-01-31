// src/app/api/user/password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserService } from '@/services/userService';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { hash, compare } from 'bcryptjs';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const setPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// =============================================================================
// GET - Check password status
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        password: true,
        passwordChangedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        hasPassword: !!user?.password,
        passwordChangedAt: user?.passwordChangedAt,
      },
    });
  } catch (error) {
    logger.error('Error checking password status', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to check password status' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Change password (for users with existing password)
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized password change attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = changePasswordSchema.parse(body);

    logger.info('Password change requested', { userId: session.user.id });

    // Verify current password exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      logger.warn('Password change attempted without existing password', { 
        userId: session.user.id 
      });
      return NextResponse.json(
        { success: false, error: 'No password set. Use PUT to set password.' },
        { status: 400 }
      );
    }

    // Verify current password
    const isValidPassword = await compare(validated.currentPassword, user.password);
    if (!isValidPassword) {
      logger.warn('Invalid current password', { userId: session.user.id });
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check if new password is same as current
    const isSamePassword = await compare(validated.newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hash(validated.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PASSWORD_CHANGE',
        category: 'auth',
        description: 'Password changed successfully',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Invalidate other sessions
    const currentSessionToken = 
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value;

    if (currentSessionToken) {
      const revokedSessions = await prisma.activeSession.updateMany({
        where: {
          userId: session.user.id,
          token: { not: currentSessionToken },
        },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'password_changed',
        },
      });

      // Also invalidate refresh tokens
      await prisma.refreshToken.updateMany({
        where: {
          userId: session.user.id,
        },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'password_changed',
        },
      });

      logger.info('Sessions invalidated after password change', {
        userId: session.user.id,
        sessionsRevoked: revokedSessions.count,
      });
    }

    logger.info('Password changed successfully', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. Other sessions have been logged out.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Password validation error', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error changing password', {}, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to change password' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Set password (for OAuth users without password)
// =============================================================================

export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized password set attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = setPasswordSchema.parse(body);

    logger.info('Password set requested', { userId: session.user.id });

    // Check if user already has a password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (user?.password) {
      logger.warn('Password set attempted with existing password', { 
        userId: session.user.id 
      });
      return NextResponse.json(
        { success: false, error: 'Password already set. Use POST to change password.' },
        { status: 400 }
      );
    }

    // Hash and set password
    const hashedPassword = await hash(validated.newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PASSWORD_CHANGE',
        category: 'auth',
        description: 'Password set for OAuth user',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Password set successfully', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Password validation error', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error setting password', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to set password' },
      { status: 500 }
    );
  }
}