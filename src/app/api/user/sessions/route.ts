// src/app/api/user/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// GET - Get all active sessions
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized sessions access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.debug('Fetching user sessions', { userId: session.user.id });

    // Get current session token
    const currentSessionToken = 
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value;

    // Fetch active sessions
    const activeSessions = await prisma.activeSession.findMany({
      where: {
        userId: session.user.id,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        token: true, // Need for comparison
        device: true,
        deviceModel: true,
        browser: true,
        browserVersion: true,
        os: true,
        osVersion: true,
        ipAddress: true,
        country: true,
        countryCode: true,
        city: true,
        region: true,
        isCurrent: true,
        lastActiveAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // Mark current session and sanitize tokens
    const sessionsWithCurrent = activeSessions.map((s) => ({
      id: s.id,
      device: s.device,
      deviceModel: s.deviceModel,
      browser: s.browser,
      browserVersion: s.browserVersion,
      os: s.os,
      osVersion: s.osVersion,
      ipAddress: s.ipAddress,
      country: s.country,
      countryCode: s.countryCode,
      city: s.city,
      region: s.region,
      isCurrent: s.token === currentSessionToken,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));

    // Count expired sessions (for info)
    const expiredCount = await prisma.activeSession.count({
      where: {
        userId: session.user.id,
        OR: [
          { isValid: false },
          { expiresAt: { lte: new Date() } },
        ],
      },
    });

    logger.info('Sessions fetched', {
      userId: session.user.id,
      activeCount: sessionsWithCurrent.length,
      expiredCount,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionsWithCurrent,
        activeCount: sessionsWithCurrent.length,
        expiredCount,
      },
    });
  } catch (error) {
    logger.error('Error fetching sessions', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Revoke all other sessions
// =============================================================================

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized session revocation');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Revoking all other sessions', { userId: session.user.id });

    // Get current session token
    const currentSessionToken = 
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value;

    // Get current session ID
    const currentActiveSession = currentSessionToken
      ? await prisma.activeSession.findUnique({
          where: { token: currentSessionToken },
          select: { id: true },
        })
      : null;

    // Revoke all other sessions
    const sessionResult = await prisma.activeSession.updateMany({
      where: {
        userId: session.user.id,
        ...(currentActiveSession ? { id: { not: currentActiveSession.id } } : {}),
      },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'user_revoked_all',
      },
    });

    // Also invalidate refresh tokens
    const tokenResult = await prisma.refreshToken.updateMany({
      where: {
        userId: session.user.id,
      },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'user_revoked_all',
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LOGOUT',
        category: 'auth',
        description: `Revoked ${sessionResult.count} session(s) and ${tokenResult.count} refresh token(s)`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Sessions revoked', {
      userId: session.user.id,
      sessionsRevoked: sessionResult.count,
      tokensRevoked: tokenResult.count,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionsRevoked: sessionResult.count,
        tokensRevoked: tokenResult.count,
      },
      message: `${sessionResult.count} session(s) revoked successfully`,
    });
  } catch (error) {
    logger.error('Error revoking sessions', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke sessions' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Clean up expired sessions
// =============================================================================

export async function POST(request: NextRequest) {
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
    const { action } = body;

    if (action !== 'cleanup') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    logger.info('Cleaning up expired sessions', { userId: session.user.id });

    // Delete expired and revoked sessions
    const result = await prisma.activeSession.deleteMany({
      where: {
        userId: session.user.id,
        OR: [
          { isValid: false },
          { expiresAt: { lte: new Date() } },
        ],
      },
    });

    // Also delete expired refresh tokens
    const tokenResult = await prisma.refreshToken.deleteMany({
      where: {
        userId: session.user.id,
        OR: [
          { isValid: false },
          { expiresAt: { lte: new Date() } },
        ],
      },
    });

    logger.info('Session cleanup complete', {
      userId: session.user.id,
      sessionsDeleted: result.count,
      tokensDeleted: tokenResult.count,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionsDeleted: result.count,
        tokensDeleted: tokenResult.count,
      },
      message: `Cleaned up ${result.count} expired session(s)`,
    });
  } catch (error) {
    logger.error('Error cleaning up sessions', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup sessions' },
      { status: 500 }
    );
  }
}