// src/app/api/admin/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// =============================================================================
// VALIDATION
// =============================================================================

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  username: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional(),
  isAdmin: z.boolean().optional(),
});

// =============================================================================
// HELPER
// =============================================================================

async function checkAdminAccess(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, role: true },
  });

  if (!user?.isAdmin && user?.role !== 'admin') {
    return { authorized: false, error: 'Admin access required', status: 403 };
  }

  return { authorized: true, adminId: session.user.id };
}

// ✅ FIXED: Use Promise pattern for params
interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// GET - Get single user with full details
// =============================================================================

export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();

  try {
    const { id } = await context.params; // ✅ FIXED: await params
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    logger.debug('Admin fetching user details', { adminId: access.adminId, userId: id });

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        platforms: {
          include: {
            platform: { select: { name: true, slug: true, icon: true } },
          },
        },
        subscription: true,
        settings: true,
        _count: {
          select: {
            trackerEntries: true,
            goals: true,
            achievements: true,
            notifications: true,
            syncLogs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        action: true,
        description: true,
        createdAt: true,
        ipAddress: true,
      },
    });

    // Get active sessions
    const activeSessions = await prisma.activeSession.findMany({
      where: { userId: id, isValid: true },
      select: {
        device: true,
        browser: true,
        country: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    logger.info('User details fetched', {
      adminId: access.adminId,
      userId: id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        user: { ...user, password: undefined },
        recentActivity,
        activeSessions,
      },
    });
  } catch (error) {
    logger.error('Error fetching user details', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update user
// =============================================================================

export async function PUT(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    logger.info('Admin updating user', {
      adminId: access.adminId,
      userId: id,
      fields: Object.keys(validated),
    });

    // Prevent self-demotion
    if (id === access.adminId && (validated.isAdmin === false || validated.role === 'user')) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove your own admin privileges' },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true, username: true, isAdmin: true, isBanned: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Prisma.UserUpdateInput = { ...validated };

    if (validated.isAdmin !== undefined) {
      updateData.role = validated.isAdmin ? 'admin' : 'user';
    }
    if (validated.role !== undefined) {
      updateData.isAdmin = validated.role === 'admin';
    }

    // Handle ban
    if (validated.isBanned === true && !currentUser.isBanned) {
      updateData.bannedAt = new Date();
      updateData.bannedBy = access.adminId;
      updateData.banReason = validated.banReason || 'Banned by admin';

      await prisma.activeSession.updateMany({
        where: { userId: id },
        data: { isValid: false, revokedAt: new Date(), revokedReason: 'user_banned' },
      });
    } else if (validated.isBanned === false && currentUser.isBanned) {
      updateData.bannedAt = null;
      updateData.bannedBy = null;
      updateData.banReason = null;
    }

    updateData.updatedAt = new Date();

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        isVerified: true,
        isBanned: true,
        banReason: true,
        isAdmin: true,
        updatedAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: access.adminId,
        action: 'ADMIN_ACTION',
        category: 'admin',
        entityType: 'user',
        entityId: id,
        description: 'Admin updated user',
        oldValue: currentUser,
        newValue: validated,
        performedBy: access.adminId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      },
    });

    logger.info('User updated by admin', {
      adminId: access.adminId,
      userId: id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error updating user', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH - Partial update (same as PUT for compatibility)
// =============================================================================

export async function PATCH(request: NextRequest, context: RouteContext) {
  return PUT(request, context);
}

// =============================================================================
// DELETE - Delete user
// =============================================================================

export async function DELETE(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    if (id === access.adminId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account via admin' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    logger.warn('Admin deleting user', { adminId: access.adminId, userId: id, hardDelete });

    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true, username: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Audit log before deletion
    await prisma.auditLog.create({
      data: {
        userId: access.adminId,
        action: 'ADMIN_ACTION',
        category: 'admin',
        entityType: 'user',
        entityId: id,
        description: `Admin ${hardDelete ? 'hard' : 'soft'} deleted user`,
        oldValue: user,
        performedBy: access.adminId,
      },
    });

    if (hardDelete) {
      await prisma.$transaction(async (tx) => {
        await tx.goalReminder.deleteMany({ where: { userId: id } });
        await tx.goal.deleteMany({ where: { userId: id } });
        await tx.userAchievement.deleteMany({ where: { userId: id } });
        await tx.notification.deleteMany({ where: { userId: id } });
        await tx.pushSubscription.deleteMany({ where: { userId: id } });
        await tx.trackerEntry.deleteMany({ where: { userId: id } });
        await tx.dailyStats.deleteMany({ where: { userId: id } });
        await tx.streakHistory.deleteMany({ where: { userId: id } });
        await tx.syncLog.deleteMany({ where: { userId: id } });
        await tx.userPlatform.deleteMany({ where: { userId: id } });
        await tx.customPlatform.deleteMany({ where: { userId: id } });
        await tx.exportJob.deleteMany({ where: { userId: id } });
        await tx.scheduledExport.deleteMany({ where: { userId: id } });
        await tx.apiKey.deleteMany({ where: { userId: id } });
        await tx.activeSession.deleteMany({ where: { userId: id } });
        await tx.refreshToken.deleteMany({ where: { userId: id } });
        await tx.twoFactorAuth.deleteMany({ where: { userId: id } });
        await tx.backupCode.deleteMany({ where: { userId: id } });
        await tx.passwordReset.deleteMany({ where: { userId: id } });
        await tx.emailVerification.deleteMany({ where: { userId: id } });
        await tx.emailChangeRequest.deleteMany({ where: { userId: id } });
        await tx.loginAttempt.deleteMany({ where: { userId: id } });
        await tx.userSettings.deleteMany({ where: { userId: id } });
        await tx.notificationPreferences.deleteMany({ where: { userId: id } });
        await tx.subscription.deleteMany({ where: { userId: id } });
        await tx.invoice.deleteMany({ where: { userId: id } });
        await tx.paymentMethod.deleteMany({ where: { userId: id } });
        await tx.report.deleteMany({ where: { userId: id } });
        await tx.supportTicket.deleteMany({ where: { userId: id } });
        await tx.account.deleteMany({ where: { userId: id } });
        await tx.session.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
      });

      logger.info('User hard deleted', {
        adminId: access.adminId,
        userId: id,
        duration: Date.now() - startTime,
      });

      return NextResponse.json({ success: true, message: 'User permanently deleted' });
    } else {
      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          email: `deleted_${id}@deleted.local`,
          username: `deleted_${id}`,
        },
      });

      await prisma.activeSession.updateMany({
        where: { userId: id },
        data: { isValid: false, revokedAt: new Date(), revokedReason: 'admin_deleted' },
      });

      logger.info('User soft deleted', {
        adminId: access.adminId,
        userId: id,
        duration: Date.now() - startTime,
      });

      return NextResponse.json({ success: true, message: 'User deactivated' });
    }
  } catch (error) {
    logger.error('Error deleting user', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}