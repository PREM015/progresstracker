/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/user/2fa/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { authenticator } from 'otplib';
import { encrypt, decrypt } from '@/lib/encryption';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const disable2FASchema = z.object({
  code: z.string().length(6),
  password: z.string().min(1),
});

const verifySetupSchema = z.object({
  code: z.string().length(6),
});

// =============================================================================
// GET - Get 2FA status
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized 2FA status access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.debug('Fetching 2FA status', { userId: session.user.id });

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
      select: {
        isEnabled: true,
        isPending: true,
        verifiedAt: true,
        lastUsedAt: true,
        recoveryEmail: true,
        recoveryPhone: true,
        createdAt: true,
      },
    });

    const backupCodesCount = await prisma.backupCode.count({
      where: {
        userId: session.user.id,
        usedAt: null,
      },
    });

    const totalBackupCodes = await prisma.backupCode.count({
      where: { userId: session.user.id },
    });

    logger.info('2FA status fetched', {
      userId: session.user.id,
      isEnabled: twoFactorAuth?.isEnabled ?? false,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        isEnabled: twoFactorAuth?.isEnabled ?? false,
        isPending: twoFactorAuth?.isPending ?? false,
        verifiedAt: twoFactorAuth?.verifiedAt,
        lastUsedAt: twoFactorAuth?.lastUsedAt,
        recoveryEmail: twoFactorAuth?.recoveryEmail ? '***' + twoFactorAuth.recoveryEmail.slice(-10) : null,
        recoveryPhone: twoFactorAuth?.recoveryPhone ? '***' + twoFactorAuth.recoveryPhone.slice(-4) : null,
        backupCodesRemaining: backupCodesCount,
        totalBackupCodes,
        createdAt: twoFactorAuth?.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching 2FA status', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch 2FA status' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Enable/Setup 2FA
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized 2FA setup attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, username: true, name: true },
    });

    if (!user?.email) {
      logger.warn('2FA setup attempted without email', { userId: session.user.id });
      return NextResponse.json(
        { success: false, error: 'Email required for 2FA setup' },
        { status: 400 }
      );
    }

    // Check if already enabled
    const existing = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });

    if (existing?.isEnabled) {
      logger.warn('2FA already enabled', { userId: session.user.id });
      return NextResponse.json(
        { success: false, error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    logger.info('Setting up 2FA', { userId: session.user.id });

    // Generate secret
    const secret = authenticator.generateSecret();
    const encryptedSecret = encrypt(secret);

    // Create or update 2FA record
    await prisma.twoFactorAuth.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        secret: encryptedSecret,
        isEnabled: false,
        isPending: true,
      },
      update: {
        secret: encryptedSecret,
        isEnabled: false,
        isPending: true,
        updatedAt: new Date(),
      },
    });

    // Generate QR code
    const appName = process.env.APP_NAME || 'ProgressTracker';
    const identifier = user.username || user.email;
    const otpAuthUrl = authenticator.keyuri(identifier, appName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Generate backup codes (10 codes)
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    // Delete old backup codes and create new ones
    await prisma.backupCode.deleteMany({
      where: { userId: session.user.id },
    });

    // Hash backup codes before storing
    await prisma.backupCode.createMany({
      data: await Promise.all(
        backupCodes.map(async (code) => ({
          userId: session.user.id,
          code: await bcrypt.hash(code, 10), // Hash for security
        }))
      ),
    });

    logger.info('2FA setup initiated', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCode: qrCodeDataUrl,
        secret: secret, // Show only once - user should save this
        backupCodes: backupCodes, // Show only once - user should save these
        message: 'Scan the QR code with your authenticator app, then verify with a code',
      },
    });
  } catch (error) {
    logger.error('Error setting up 2FA', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Verify and complete 2FA setup
// =============================================================================

export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code } = verifySetupSchema.parse(body);

    logger.debug('Verifying 2FA setup', { userId: session.user.id });

    // Get pending 2FA setup
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });

    if (!twoFactorAuth) {
      return NextResponse.json(
        { success: false, error: 'No 2FA setup in progress' },
        { status: 400 }
      );
    }

    if (twoFactorAuth.isEnabled) {
      return NextResponse.json(
        { success: false, error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    // Verify the code
    const decryptedSecret = decrypt(twoFactorAuth.secret);
    const isValidCode = authenticator.verify({
      token: code,
      secret: decryptedSecret,
    });

    if (!isValidCode) {
      logger.warn('Invalid 2FA verification code', { userId: session.user.id });
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Enable 2FA
    await prisma.twoFactorAuth.update({
      where: { userId: session.user.id },
      data: {
        isEnabled: true,
        isPending: false,
        verifiedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'TWO_FACTOR_ENABLE',
        category: 'auth',
        description: '2FA enabled successfully',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('2FA enabled successfully', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been enabled successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid code format', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error verifying 2FA setup', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Disable 2FA
// =============================================================================

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code, password } = disable2FASchema.parse(body);

    logger.info('Attempting to disable 2FA', { userId: session.user.id });

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      logger.warn('2FA disable attempted without password', { userId: session.user.id });
      return NextResponse.json(
        { success: false, error: 'Password verification required' },
        { status: 400 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logger.warn('Invalid password for 2FA disable', { userId: session.user.id });
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 400 }
      );
    }

    // Get 2FA record
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });

    if (!twoFactorAuth?.isEnabled) {
      return NextResponse.json(
        { success: false, error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Verify 2FA code
    const decryptedSecret = decrypt(twoFactorAuth.secret);
    const isValidCode = authenticator.verify({
      token: code,
      secret: decryptedSecret,
    });

    if (!isValidCode) {
      // Check backup codes
      const backupCodes = await prisma.backupCode.findMany({
        where: {
          userId: session.user.id,
          usedAt: null,
        },
      });

      let backupCodeUsed = false;
      let usedBackupCodeId: string | null = null;

      for (const backupCode of backupCodes) {
        const isMatch = await bcrypt.compare(code, backupCode.code);
        if (isMatch) {
          backupCodeUsed = true;
          usedBackupCodeId = backupCode.id;
          break;
        }
      }

      if (!backupCodeUsed) {
        logger.warn('Invalid 2FA code for disable', { userId: session.user.id });
        return NextResponse.json(
          { success: false, error: 'Invalid 2FA code' },
          { status: 400 }
        );
      }

      // Mark backup code as used
      if (usedBackupCodeId) {
        await prisma.backupCode.update({
          where: { id: usedBackupCodeId },
          data: {
            usedAt: new Date(),
            usedIpAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          },
        });
      }
    }

    // Disable 2FA
    await prisma.twoFactorAuth.delete({
      where: { userId: session.user.id },
    });

    // Delete backup codes
    await prisma.backupCode.deleteMany({
      where: { userId: session.user.id },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'TWO_FACTOR_DISABLE',
        category: 'auth',
        description: '2FA disabled',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('2FA disabled successfully', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error disabling 2FA', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}