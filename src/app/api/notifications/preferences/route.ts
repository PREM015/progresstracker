/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/notifications/preferences/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMA - matches NotificationPreferences model
// =============================================================================

const updatePreferencesSchema = z.object({
  // Global Settings
  enabled: z.boolean().optional(),

  // Channels
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),

  // Email Preferences
  emailAddress: z.string().email().optional().nullable(),

  // Notification Types
  achievementAlerts: z.boolean().optional(),
  goalReminders: z.boolean().optional(),
  goalCompleted: z.boolean().optional(),
  streakAlerts: z.boolean().optional(),
  syncComplete: z.boolean().optional(),
  syncFailed: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  billingAlerts: z.boolean().optional(),
  newFeatures: z.boolean().optional(),
  tips: z.boolean().optional(),
  communityUpdates: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),

  // Quiet Hours
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:MM format
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursTimezone: z.string().optional(),

  // Digest Settings
  digestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(['realtime', 'daily', 'weekly']).optional(),
  digestTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  digestDay: z.number().int().min(0).max(6).optional(), // 0-6 for weekly

  // DND
  dndEnabled: z.boolean().optional(),
  dndUntil: z.string().datetime().optional().nullable(),
});

// =============================================================================
// GET - Fetch notification preferences
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized preferences access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.debug('Fetching notification preferences', { userId: session.user.id });

    // Get or create preferences
    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: session.user.id },
    });

    // Create default preferences if not exist
    if (!preferences) {
      logger.info('Creating default notification preferences', { userId: session.user.id });
      preferences = await prisma.notificationPreferences.create({
        data: {
          userId: session.user.id,
          // All defaults are set in schema
        },
      });
    }

    logger.info('Notification preferences fetched', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to fetch notification preferences', { duration: Date.now() - startTime }, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update all preferences
// =============================================================================

export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized preferences update');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = updatePreferencesSchema.parse(body);

    logger.debug('Updating notification preferences', {
      userId: session.user.id,
      fields: Object.keys(validated),
    });

    // Upsert preferences
    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...validated,
        dndUntil: validated.dndUntil ? new Date(validated.dndUntil) : null,
      },
      update: {
        ...validated,
        dndUntil: validated.dndUntil ? new Date(validated.dndUntil) : validated.dndUntil === null ? null : undefined,
        updatedAt: new Date(),
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SETTINGS_CHANGE',
        category: 'notifications',
        entityType: 'notification_preferences',
        entityId: preferences.id,
        description: 'Notification preferences updated',
        newValue: validated,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Notification preferences updated', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid preferences data', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to update notification preferences', { duration: Date.now() - startTime }, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH - Partial preferences update
// =============================================================================

export async function PATCH(request: NextRequest) {
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
    const validated = updatePreferencesSchema.partial().parse(body);

    logger.debug('Patching notification preferences', {
      userId: session.user.id,
      fields: Object.keys(validated),
    });

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...validated,
        dndUntil: validated.dndUntil ? new Date(validated.dndUntil) : null,
      },
      update: {
        ...validated,
        dndUntil: validated.dndUntil ? new Date(validated.dndUntil) : validated.dndUntil === null ? null : undefined,
        updatedAt: new Date(),
      },
    });

    logger.info('Notification preferences patched', {
      userId: session.user.id,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to patch notification preferences', { duration: Date.now() - startTime }, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Special actions (reset, enable DND, etc.)
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
    const { action, duration } = body;

    logger.debug('Processing preferences action', {
      userId: session.user.id,
      action,
    });

    switch (action) {
      case 'reset': {
        // Delete and recreate with defaults
        await prisma.notificationPreferences.delete({
          where: { userId: session.user.id },
        }).catch(() => {
          // Ignore if doesn't exist
        });

        const preferences = await prisma.notificationPreferences.create({
          data: { userId: session.user.id },
        });

        logger.info('Notification preferences reset', { userId: session.user.id });

        return NextResponse.json({
          success: true,
          data: preferences,
          message: 'Preferences reset to defaults',
        });
      }

      case 'enable_dnd': {
        // Enable Do Not Disturb for specified duration (in hours)
        const hours = parseInt(duration) || 1;
        const dndUntil = new Date();
        dndUntil.setHours(dndUntil.getHours() + hours);

        const preferences = await prisma.notificationPreferences.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            dndEnabled: true,
            dndUntil,
          },
          update: {
            dndEnabled: true,
            dndUntil,
            updatedAt: new Date(),
          },
        });

        logger.info('DND enabled', { userId: session.user.id, dndUntil });

        return NextResponse.json({
          success: true,
          data: preferences,
          message: `Do Not Disturb enabled until ${dndUntil.toISOString()}`,
        });
      }

      case 'disable_dnd': {
        const preferences = await prisma.notificationPreferences.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            dndEnabled: false,
            dndUntil: null,
          },
          update: {
            dndEnabled: false,
            dndUntil: null,
            updatedAt: new Date(),
          },
        });

        logger.info('DND disabled', { userId: session.user.id });

        return NextResponse.json({
          success: true,
          data: preferences,
          message: 'Do Not Disturb disabled',
        });
      }

      case 'mute_all': {
        const preferences = await prisma.notificationPreferences.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            enabled: false,
          },
          update: {
            enabled: false,
            updatedAt: new Date(),
          },
        });

        logger.info('All notifications muted', { userId: session.user.id });

        return NextResponse.json({
          success: true,
          data: preferences,
          message: 'All notifications muted',
        });
      }

      case 'unmute_all': {
        const preferences = await prisma.notificationPreferences.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            enabled: true,
          },
          update: {
            enabled: true,
            updatedAt: new Date(),
          },
        });

        logger.info('All notifications unmuted', { userId: session.user.id });

        return NextResponse.json({
          success: true,
          data: preferences,
          message: 'All notifications unmuted',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Failed to process preferences action', { duration: Date.now() - startTime }, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}