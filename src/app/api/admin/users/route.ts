// src/app/api/admin/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional(),
  isAdmin: z.boolean().optional(),
  role: z.enum(['user', 'admin']).optional(),
});

// =============================================================================
// Helper: Check Admin Access
// =============================================================================

async function checkAdminAccess(session: { user?: { id?: string; email?: string | null } } | null) {
  if (!session?.user?.id) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, role: true },
  });

  if (!user?.isAdmin && user?.role !== 'admin') {
    return { authorized: false, error: 'Forbidden - Admin access required', status: 403 };
  }

  return { authorized: true, adminId: session.user.id };
}

// =============================================================================
// GET - List users with filtering and pagination
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      logger.warn('Unauthorized admin users access');
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // active, inactive, banned
    const role = searchParams.get('role'); // user, admin
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    logger.debug('Admin fetching users', {
      adminId: access.adminId,
      page,
      limit,
      search,
      status,
    });

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
      where.isBanned = false;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'banned') {
      where.isBanned = true;
    }

    if (role === 'admin') {
      where.OR = [
        { isAdmin: true },
        { role: 'admin' },
      ];
    } else if (role === 'user') {
      where.isAdmin = false;
      where.role= 'user';

    }

    // Validate sort field
    const validSortFields = ['createdAt', 'lastActiveAt', 'email', 'username', 'totalProblems', 'totalPoints'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Fetch users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByField]: sortOrder as 'asc' | 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          isActive: true,
          isVerified: true,
          isBanned: true,
          banReason: true,
          isAdmin: true,
          role: true,
          currentStreak: true,
          longestStreak: true,
          totalProblems: true,
          totalCommits: true,
          totalPoints: true,
          rank: true,
          createdAt: true,
          lastActiveAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              platforms: true,
              trackerEntries: true,
              goals: true,
              achievements: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Get stats summary
    const stats = await prisma.user.aggregate({
      _count: { id: true },
      where: { isActive: true },
    });

    const bannedCount = await prisma.user.count({ where: { isBanned: true } });
    const adminCount = await prisma.user.count({ 
      where: { OR: [{ isAdmin: true }, { role: 'admin' }] } 
    });

    logger.info('Admin users fetched', {
      adminId: access.adminId,
      count: users.length,
      total,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        users,
        stats: {
          total,
          active: stats._count.id,
          banned: bannedCount,
          admins: adminCount,
        },
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    logger.error('Error fetching admin users', {}, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update user (ban, verify, change role)
// =============================================================================

export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const validated = updateUserSchema.parse(updates);

    logger.info('Admin updating user', {
      adminId: access.adminId,
      targetUserId: userId,
      updates: Object.keys(validated),
    });

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isAdmin: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent self-demotion
    if (userId === access.adminId && validated.isAdmin === false) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove your own admin privileges' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Prisma.UserUpdateInput = {};

    if (validated.isActive !== undefined) {
      updateData.isActive = validated.isActive;
    }

    if (validated.isVerified !== undefined) {
      updateData.isVerified = validated.isVerified;
    }

    if (validated.isBanned !== undefined) {
      updateData.isBanned = validated.isBanned;
      if (validated.isBanned) {
        updateData.bannedAt = new Date();
        updateData.bannedBy = access.adminId;
        updateData.banReason = validated.banReason || 'Banned by admin';
        // Invalidate all sessions
        await prisma.activeSession.updateMany({
          where: { userId },
          data: { isValid: false, revokedAt: new Date(), revokedReason: 'user_banned' },
        });
      } else {
        updateData.bannedAt = null;
        updateData.bannedBy = null;
        updateData.banReason = null;
      }
    }

    if (validated.isAdmin !== undefined) {
      updateData.isAdmin = validated.isAdmin;
      updateData.role = validated.isAdmin ? 'admin' : 'user';
    }

    if (validated.role !== undefined) {
      updateData.role = validated.role;
      updateData.isAdmin = validated.role === 'admin';
    }

    updateData.updatedAt = new Date();

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
        isVerified: true,
        isBanned: true,
        banReason: true,
        isAdmin: true,
        role: true,
        updatedAt: true,
      },
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        userId: access.adminId,
        action: 'ADMIN_ACTION',
        category: 'admin',
        entityType: 'user',
        entityId: userId,
        description: `Admin updated user: ${JSON.stringify(validated)}`,
        oldValue: targetUser,
        newValue: updatedUser,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        performedBy: access.adminId,
      },
    });

    logger.info('Admin user updated', {
      adminId: access.adminId,
      targetUserId: userId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error updating admin user', {}, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete user (admin action)
// =============================================================================

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const hardDelete = searchParams.get('hardDelete') === 'true';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (userId === access.adminId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account via admin' },
        { status: 400 }
      );
    }

    logger.warn('Admin deleting user', {
      adminId: access.adminId,
      targetUserId: userId,
      hardDelete,
    });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Log before deletion
    await prisma.auditLog.create({
      data: {
        userId: access.adminId,
        action: 'ADMIN_ACTION',
        category: 'admin',
        entityType: 'user',
        entityId: userId,
        description: `Admin ${hardDelete ? 'hard' : 'soft'} deleted user`,
        oldValue: targetUser,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        performedBy: access.adminId,
      },
    });

    if (hardDelete) {
      // Hard delete - remove all user data
      await prisma.$transaction(async (tx) => {
        // Delete in order of dependencies (same as user delete route)
        await tx.goalReminder.deleteMany({ where: { userId } });
        await tx.goal.deleteMany({ where: { userId } });
        await tx.userAchievement.deleteMany({ where: { userId } });
        await tx.notification.deleteMany({ where: { userId } });
        await tx.pushSubscription.deleteMany({ where: { userId } });
        await tx.trackerEntry.deleteMany({ where: { userId } });
        await tx.dailyStats.deleteMany({ where: { userId } });
        await tx.streakHistory.deleteMany({ where: { userId } });
        await tx.syncLog.deleteMany({ where: { userId } });
        await tx.userPlatform.deleteMany({ where: { userId } });
        await tx.customPlatform.deleteMany({ where: { userId } });
        await tx.exportJob.deleteMany({ where: { userId } });
        await tx.scheduledExport.deleteMany({ where: { userId } });
        await tx.apiKey.deleteMany({ where: { userId } });
        await tx.activeSession.deleteMany({ where: { userId } });
        await tx.refreshToken.deleteMany({ where: { userId } });
        await tx.twoFactorAuth.deleteMany({ where: { userId } });
        await tx.backupCode.deleteMany({ where: { userId } });
        await tx.passwordReset.deleteMany({ where: { userId } });
        await tx.emailVerification.deleteMany({ where: { userId } });
        await tx.emailChangeRequest.deleteMany({ where: { userId } });
        await tx.loginAttempt.deleteMany({ where: { userId } });
        await tx.userSettings.deleteMany({ where: { userId } });
        await tx.notificationPreferences.deleteMany({ where: { userId } });
        await tx.subscription.deleteMany({ where: { userId } });
        await tx.invoice.deleteMany({ where: { userId } });
        await tx.paymentMethod.deleteMany({ where: { userId } });
        await tx.report.deleteMany({ where: { userId } });
        await tx.supportTicket.deleteMany({ where: { userId } });
        await tx.account.deleteMany({ where: { userId } });
        await tx.session.deleteMany({ where: { userId } });
        await tx.user.delete({ where: { id: userId } });
      });

      logger.info('User hard deleted by admin', {
        adminId: access.adminId,
        targetUserId: userId,
        duration: Date.now() - startTime,
      });

      return NextResponse.json({
        success: true,
        message: 'User permanently deleted',
      });
    } else {
      // Soft delete
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          email: `deleted_${userId}@deleted.local`,
          username: `deleted_${userId}`,
        },
      });

      // Invalidate sessions
      await prisma.activeSession.updateMany({
        where: { userId },
        data: { isValid: false, revokedAt: new Date(), revokedReason: 'admin_deleted' },
      });

      logger.info('User soft deleted by admin', {
        adminId: access.adminId,
        targetUserId: userId,
        duration: Date.now() - startTime,
      });

      return NextResponse.json({
        success: true,
        message: 'User deactivated (soft delete)',
      });
    }
  } catch (error) {
    logger.error('Error deleting user by admin', {}, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}