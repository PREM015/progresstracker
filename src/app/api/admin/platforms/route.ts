// src/app/api/admin/platforms/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { PlatformCategory, AuthType, Prisma } from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createPlatformSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(100),
  displayName: z.string().optional(),
  description: z.string().optional(),
  category: z.nativeEnum(PlatformCategory),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  authType: z.nativeEnum(AuthType).optional(),
  icon: z.string().optional(),
  logo: z.string().optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  website: z.string().url().optional(),
  apiEndpoint: z.string().url().optional(),
  profileUrlPattern: z.string().optional(),
  supportsAutoSync: z.boolean().optional(),
  supportsWebhook: z.boolean().optional(),
  supportsOAuth: z.boolean().optional(),
  supportsApiKey: z.boolean().optional(),
  requiresCredentials: z.boolean().optional(),
  syncPriority: z.number().int().optional(),
  syncInterval: z.number().int().optional(),
  rateLimit: z.number().int().optional(),
  rateLimitWindow: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isBeta: z.boolean().optional(),
  setupGuideUrl: z.string().url().optional(),
  helpArticleUrl: z.string().url().optional(),
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

// =============================================================================
// GET - List all platforms
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      logger.warn('Unauthorized admin platforms access');
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as PlatformCategory | null;
    const isActive = searchParams.get('active');
    const search = searchParams.get('search');

    logger.debug('Admin fetching platforms', { adminId: access.adminId });

    // Build where clause
    const where: Prisma.PlatformWhereInput = {};

    if (category && Object.values(PlatformCategory).includes(category)) {
      where.category = category;
    }

    if (isActive === 'true') {
      where.isActive = true;
    } else if (isActive === 'false') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const platforms = await prisma.platform.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { totalUsers: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        _count: {
          select: {
            users: true,
            trackerEntries: true,
            syncLogs: true,
          },
        },
      },
    });

    // Get stats by category
    const categoryStats = await prisma.platform.groupBy({
      by: ['category'],
      _count: true,
    });

    const categoryMap = categoryStats.reduce((acc, s) => {
      acc[s.category] = s._count;
      return acc;
    }, {} as Record<string, number>);

    const totalConnections = await prisma.userPlatform.count({
      where: { isActive: true },
    });

    logger.info('Admin platforms fetched', {
      adminId: access.adminId,
      count: platforms.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        platforms,
        stats: {
          total: platforms.length,
          active: platforms.filter(p => p.isActive).length,
          inactive: platforms.filter(p => !p.isActive).length,
          beta: platforms.filter(p => p.isBeta).length,
          totalConnections,
          byCategory: categoryMap,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching admin platforms', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create new platform
// =============================================================================

export async function POST(request: NextRequest) {
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
    const validated = createPlatformSchema.parse(body);

    logger.info('Creating platform', { adminId: access.adminId, slug: validated.slug });

    // Check if slug already exists
    const existing = await prisma.platform.findUnique({
      where: { slug: validated.slug },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Platform with this slug already exists' },
        { status: 409 }
      );
    }

    const platform = await prisma.platform.create({
      data: {
        slug: validated.slug,
        name: validated.name,
        displayName: validated.displayName,
        description: validated.description,
        category: validated.category,
        subcategory: validated.subcategory,
        tags: validated.tags || [],
        authType: validated.authType || 'NONE',
        icon: validated.icon,
        logo: validated.logo,
        color: validated.color,
        backgroundColor: validated.backgroundColor,
        website: validated.website,
        apiEndpoint: validated.apiEndpoint,
        profileUrlPattern: validated.profileUrlPattern,
        supportsAutoSync: validated.supportsAutoSync ?? false,
        supportsWebhook: validated.supportsWebhook ?? false,
        supportsOAuth: validated.supportsOAuth ?? false,
        supportsApiKey: validated.supportsApiKey ?? false,
        requiresCredentials: validated.requiresCredentials ?? false,
        syncPriority: validated.syncPriority ?? 0,
        syncInterval: validated.syncInterval ?? 1440,
        rateLimit: validated.rateLimit,
        rateLimitWindow: validated.rateLimitWindow,
        isActive: validated.isActive ?? true,
        isVerified: validated.isVerified ?? false,
        isBeta: validated.isBeta ?? false,
        setupGuideUrl: validated.setupGuideUrl,
        helpArticleUrl: validated.helpArticleUrl,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: access.adminId,
        action: 'CREATE',
        category: 'admin',
        entityType: 'platform',
        entityId: platform.id,
        description: `Created platform: ${platform.name}`,
        newValue: platform,
        performedBy: access.adminId,
      },
    });

    logger.info('Platform created', {
      adminId: access.adminId,
      platformId: platform.id,
      slug: platform.slug,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: platform,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error creating platform', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to create platform' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Bulk update platforms
// =============================================================================

export async function PUT(request: NextRequest) {
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
    const { ids, updates } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Platform IDs required' },
        { status: 400 }
      );
    }

    logger.info('Bulk updating platforms', { adminId: access.adminId, count: ids.length });

    const result = await prisma.platform.updateMany({
      where: { id: { in: ids } },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    logger.info('Platforms bulk updated', { adminId: access.adminId, updated: result.count });

    return NextResponse.json({
      success: true,
      data: { updatedCount: result.count },
    });
  } catch (error) {
    logger.error('Error bulk updating platforms', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update platforms' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete platform(s)
// =============================================================================

export async function DELETE(request: NextRequest) {
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
    const ids = searchParams.get('ids')?.split(',') || [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Platform IDs required' },
        { status: 400 }
      );
    }

    logger.warn('Deleting platforms', { adminId: access.adminId, count: ids.length });

    // Check if any platform has users
    const platformsWithUsers = await prisma.userPlatform.findMany({
      where: { platformId: { in: ids } },
      select: { platformId: true },
    });

    if (platformsWithUsers.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete platforms with active user connections. Deactivate them instead.' 
        },
        { status: 400 }
      );
    }

    const result = await prisma.platform.deleteMany({
      where: { id: { in: ids } },
    });

    logger.info('Platforms deleted', { adminId: access.adminId, deleted: result.count });

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    logger.error('Error deleting platforms', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete platforms' },
      { status: 500 }
    );
  }
}