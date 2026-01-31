// src/app/api/user/2fa/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authenticator } from 'otplib';
import { decrypt } from '@/lib/encryption';

// POST - Verify 2FA code (completes setup)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });

    if (!twoFactorAuth) {
      return NextResponse.json(
        { error: '2FA not set up. Please initiate setup first.' },
        { status: 400 }
      );
    }

    if (twoFactorAuth.isEnabled && !twoFactorAuth.isPending) {
      return NextResponse.json(
        { error: '2FA is already verified and enabled' },
        { status: 400 }
      );
    }

    // Decrypt and verify
    const decryptedSecret = decrypt(twoFactorAuth.secret);
    const isValid = authenticator.verify({
      token: code,
      secret: decryptedSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
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
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'TWO_FACTOR_ENABLE',
        category: 'auth',
        description: '2FA enabled and verified',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been successfully enabled',
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA code' },
      { status: 500 }
    );
  }
}