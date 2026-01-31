/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/platforms/connect/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { stripeService } from '@/services/stripeService';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const connectSchema = z.object({
  platformId: z.string().min(1, 'Platform ID is required'),
  username: z.string().min(1).max(100).optional(),
  profileUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  externalUserId: z.string().optional(),
  autoSync: z.boolean().default(true),
});

const disconnectSchema = z.object({
  platformId: z.string().min(1, 'Platform ID is required'),
  disconnectReason: z.string().min(1, 'Disconnect reason is required ${optional}').optional(),
});

const updateSchema = z.object({
  platformId: z.string().min(1, 'Platform ID is required'),
  username: z.string().min(1).max(100).optional(),
  profileUrl: z.string().url().optional(),
  autoSync: z.boolean().optional(),
  syncPriority: z.number().int().min(0).max(10).optional(),
});

// =============================================================================
// POST - Connect a platform
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'POST /api/platforms/connect' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized platform connect attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = connectSchema.parse(body);

    log.info('Platform connect request', {
      userId: session.user.id,
      platformId: validated.platformId,
    });

    // Check if platform exists and is active
    const platform = await prisma.platform.findUnique({
      where: { id: validated.platformId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        supportsAutoSync: true,
        authType: true,
        requiresCredentials: true,
      },
    });

    if (!platform) {
      log.warn('Platform not found', { platformId: validated.platformId });
      return NextResponse.json(
        { success: false, error: 'Platform not found' },
        { status: 404 }
      );
    }

    if (!platform.isActive) {
      log.warn('Platform is not active', { platformId: validated.platformId });
      return NextResponse.json(
        { success: false, error: 'This platform is currently unavailable' },
        { status: 400 }
      );
    }

    // Check if already connected
    const existingConnection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId: session.user.id,
          platformId: validated.platformId,
        },
      },
    });

    if (existingConnection) {
      log.warn('Platform already connected', {
        userId: session.user.id,
        platformId: validated.platformId,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Platform already connected',
          connection: existingConnection,
        },
        { status: 409 }
      );
    }

    // Check subscription limits
    const canAdd = await stripeService.canAddPlatform(session.user.id);
    if (!canAdd) {
      log.warn('Platform limit reached', { userId: session.user.id });
      return NextResponse.json(
        { 
          success: false, 
          error: 'You have reached your platform limit. Please upgrade your plan.',
          code: 'PLATFORM_LIMIT_REACHED',
        },
        { status: 403 }
      );
    }

    // Validate credentials if required
    if (platform.requiresCredentials) {
      if (!validated.username && !validated.apiKey && !validated.accessToken) {
        log.warn('Credentials required but not provided', {
          platformId: validated.platformId,
        });
        return NextResponse.json(
          { 
            success: false, 
            error: 'This platform requires credentials (username, API key, or access token)',
          },
          { status: 400 }
        );
      }
    }

    // Build profile URL if not provided
    let profileUrl = validated.profileUrl;
    if (!profileUrl && validated.username) {
      // Get profile URL pattern from platform
      const platformDetails = await prisma.platform.findUnique({
        where: { id: validated.platformId },
        select: { profileUrlPattern: true },
      });
      
      if (platformDetails?.profileUrlPattern) {
        profileUrl = platformDetails.profileUrlPattern.replace('{username}', validated.username);
      }
    }

    // Create connection
    const connection = await prisma.userPlatform.create({
      data: {
        userId: session.user.id,
        platformId: validated.platformId,
        username: validated.username || null,
        profileUrl: profileUrl || null,
        externalUserId: validated.externalUserId || null,
        apiKey: validated.apiKey || null,
        accessToken: validated.accessToken || null,
        refreshToken: validated.refreshToken || null,
        isActive: true,
        isVerified: false,
        connectionStatus: 'pending',
        syncStatus: 'IDLE',
        autoSync: validated.autoSync && platform.supportsAutoSync,
        syncPriority: 0,
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            category: true,
            supportsAutoSync: true,
          },
        },
      },
    });

    // Update platform user count
    await prisma.platform.update({
      where: { id: validated.platformId },
      data: { totalUsers: { increment: 1 } },
    });

    // Update subscription platform count
    await stripeService.incrementPlatformCount(session.user.id);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        category: 'platform',
        entityType: 'userPlatform',
        entityId: connection.id,
        description: `Connected platform: ${platform.name}`,
        status: 'success',
      },
    });

    log.info('Platform connected successfully', {
      userId: session.user.id,
      platformId: validated.platformId,
      connectionId: connection.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Platform connected successfully',
        connection,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Invalid connect request', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    log.error(
      'Failed to connect platform',
      { duration: Date.now() - startTime },
      error
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect platform',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Disconnect a platform
// =============================================================================

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'DELETE /api/platforms/connect' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized platform disconnect attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get('platformId');

    if (!platformId) {
      return NextResponse.json(
        { success: false, error: 'Platform ID is required' },
        { status: 400 }
      );
    }

    log.info('Platform disconnect request', {
      userId: session.user.id,
      platformId,
    });

    // Find the connection
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId: session.user.id,
          platformId,
        },
      },
      include: {
        platform: {
          select: { name: true },
        },
      },
    });

    if (!connection) {
      log.warn('Platform connection not found', {
        userId: session.user.id,
        platformId,
      });
      return NextResponse.json(
        { success: false, error: 'Platform connection not found' },
        { status: 404 }
      );
    }

    // Delete the connection
    await prisma.userPlatform.delete({
      where: {
        userId_platformId: {
          userId: session.user.id,
          platformId,
        },
      },
    });

    // Update platform user count
    await prisma.platform.update({
      where: { id: platformId },
      data: { totalUsers: { decrement: 1 } },
    });

    // Update subscription platform count
    await stripeService.decrementPlatformCount(session.user.id);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        category: 'platform',
        entityType: 'userPlatform',
        entityId: connection.id,
        description: `Disconnected platform: ${connection.platform.name}`,
        status: 'success',
      },
    });

    log.info('Platform disconnected successfully', {
      userId: session.user.id,
      platformId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Platform disconnected successfully',
    });
  } catch (error) {
    log.error(
      'Failed to disconnect platform',
      { duration: Date.now() - startTime },
      error
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to disconnect platform',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update platform connection
// =============================================================================

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'PUT /api/platforms/connect' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized platform update attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    log.info('Platform update request', {
      userId: session.user.id,
      platformId: validated.platformId,
    });

    // Find the connection
    const existingConnection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId: session.user.id,
          platformId: validated.platformId,
        },
      },
    });

    if (!existingConnection) {
      log.warn('Platform connection not found', {
        userId: session.user.id,
        platformId: validated.platformId,
      });
      return NextResponse.json(
        { success: false, error: 'Platform connection not found' },
        { status: 404 }
      );
    }

    // Update connection
    const connection = await prisma.userPlatform.update({
      where: {
        userId_platformId: {
          userId: session.user.id,
          platformId: validated.platformId,
        },
      },
      data: {
        username: validated.username ?? existingConnection.username,
        profileUrl: validated.profileUrl ?? existingConnection.profileUrl,
        autoSync: validated.autoSync ?? existingConnection.autoSync,
        syncPriority: validated.syncPriority ?? existingConnection.syncPriority,
        updatedAt: new Date(),
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            category: true,
          },
        },
      },
    });

    log.info('Platform connection updated', {
      userId: session.user.id,
      platformId: validated.platformId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Platform connection updated',
      connection,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Invalid update request', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    log.error(
      'Failed to update platform connection',
      { duration: Date.now() - startTime },
      error
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update platform connection',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET - Get connected platforms for user
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'GET /api/platforms/connect' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized get connections attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get('platformId');

    log.debug('Getting platform connections', {
      userId: session.user.id,
      platformId,
    });

    if (platformId) {
      // Get specific connection
      const connection = await prisma.userPlatform.findUnique({
        where: {
          userId_platformId: {
            userId: session.user.id,
            platformId,
          },
        },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
              category: true,
              supportsAutoSync: true,
            },
          },
        },
      });

      if (!connection) {
        return NextResponse.json(
          { success: false, error: 'Connection not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        connection,
      });
    }

    // Get all connections
    const connections = await prisma.userPlatform.findMany({
      where: { userId: session.user.id },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            category: true,
            supportsAutoSync: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { lastSyncedAt: 'desc' },
      ],
    });

    log.info('Connections retrieved', {
      userId: session.user.id,
      count: connections.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      connections,
      count: connections.length,
    });
  } catch (error) {
    log.error(
      'Failed to get platform connections',
      { duration: Date.now() - startTime },
      error
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get platform connections',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}