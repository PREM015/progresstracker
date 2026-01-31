/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/user/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  bio: z.string().max(500).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable(),
  company: z.string().max(100).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  githubUsername: z.string().max(50).optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  twitterHandle: z.string().max(50).optional().nullable(),
  discordUsername: z.string().max(50).optional().nullable(),
  timezone: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

const updatePrivacySchema = z.object({
  isPublic: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  showGoals: z.boolean().optional(),
  showPlatforms: z.boolean().optional(),
  showStreak: z.boolean().optional(),
});

// =============================================================================
// GET - Get current user profile
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'GET /api/user' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized user profile access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    log.debug('Fetching user profile', { userId: session.user.id });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        bio: true,
        location: true,
        website: true,
        company: true,
        jobTitle: true,
        githubUsername: true,
        linkedinUrl: true,
        twitterHandle: true,
        discordUsername: true,
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
        isVerified: true,
        emailVerified: true,
        currentStreak: true,
        longestStreak: true,
        totalProblems: true,
        totalCommits: true,
        totalProjects: true,
        totalCertifications: true,
        totalAchievements: true,
        totalPoints: true,
        rank: true,
        preferredLanguage: true,
        timezone: true,
        referralCode: true,
        createdAt: true,
        lastActiveAt: true,
        // Relations
        subscription: {
          select: {
            tier: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
        _count: {
          select: {
            platforms: true,
            goals: true,
            achievements: true,
            trackerEntries: true,
          },
        },
      },
    });

    if (!user) {
      log.error('User not found in database', { userId: session.user.id });
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    log.info('User profile fetched', {
      userId: user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    log.error(
      'Failed to fetch user profile',
      { duration: Date.now() - startTime },
      error
    );
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Full profile update
// =============================================================================

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'PUT /api/user' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized profile update attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    log.debug('Updating user profile', {
      userId: session.user.id,
      fields: Object.keys(validated),
    });

    // Check username uniqueness if being updated
    if (validated.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: validated.username.toLowerCase(),
          NOT: { id: session.user.id },
        },
      });

      if (existingUser) {
        log.warn('Username already taken', { username: validated.username });
        return NextResponse.json(
          { success: false, error: 'Username already taken' },
          { status: 409 }
        );
      }

      validated.username = validated.username.toLowerCase();
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...validated,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        bio: true,
        location: true,
        website: true,
        company: true,
        jobTitle: true,
        githubUsername: true,
        linkedinUrl: true,
        twitterHandle: true,
        discordUsername: true,
        timezone: true,
        preferredLanguage: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        category: 'user',
        entityType: 'user',
        entityId: session.user.id,
        description: 'Profile updated',
        changes: validated,
        status: 'success',
      },
    });

    log.info('User profile updated', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Invalid profile update data', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    log.error(
      'Failed to update user profile',
      { duration: Date.now() - startTime },
      error
    );
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH - Partial update (privacy settings, etc.)
// =============================================================================

export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'PATCH /api/user' });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn('Unauthorized partial update attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Determine which schema to use based on fields
    const isPrivacyUpdate = Object.keys(body).some((key) =>
      ['isPublic', 'showEmail', 'showLocation', 'showActivity', 'showAchievements', 'showGoals', 'showPlatforms', 'showStreak'].includes(key)
    );

    const validated = isPrivacyUpdate
      ? updatePrivacySchema.parse(body)
      : updateProfileSchema.partial().parse(body);

    log.debug('Partial user update', {
      userId: session.user.id,
      isPrivacyUpdate,
      fields: Object.keys(validated),
    });

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...validated,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        location: true,
        website: true,
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
        updatedAt: true,
      },
    });

    // Create audit log for privacy changes
    if (isPrivacyUpdate) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SETTINGS_CHANGE',
          category: 'privacy',
          entityType: 'user',
          entityId: session.user.id,
          description: 'Privacy settings updated',
          changes: validated,
          status: 'success',
        },
      });
    }

    log.info('User partially updated', {
      userId: session.user.id,
      isPrivacyUpdate,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Invalid partial update data', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    log.error(
      'Failed to partially update user',
      { duration: Date.now() - startTime },
      error
    );
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}