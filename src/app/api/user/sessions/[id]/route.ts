// src/app/api/user/sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

// GET - Get session details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    const activeSession = await prisma.activeSession.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
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
        latitude: true,
        longitude: true,
        isCurrent: true,
        isValid: true,
        lastActiveAt: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        revokedReason: true,
      },
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activeSession,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke specific session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Verify session belongs to user
    const activeSession = await prisma.activeSession.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if trying to revoke current session
    const currentSessionToken = request.cookies.get('next-auth.session-token')?.value;
    if (activeSession.token === currentSessionToken) {
      return NextResponse.json(
        { error: 'Cannot revoke current session. Use logout instead.' },
        { status: 400 }
      );
    }

    // Revoke the session
    await prisma.activeSession.update({
      where: { id },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'user_revoked',
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LOGOUT',
        category: 'auth',
        entityType: 'session',
        entityId: id,
        description: 'Session revoked by user',
        newValue: {
          device: activeSession.device,
          browser: activeSession.browser,
          country: activeSession.country,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}