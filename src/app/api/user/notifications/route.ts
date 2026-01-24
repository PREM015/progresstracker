// src/app/api/user/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const updateNotificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  dailyReminder: z.boolean().optional(),
  goalReminders: z.boolean().optional(),
  achievementAlerts: z.boolean().optional(),
  syncFailures: z.boolean().optional(),
  newFeatures: z.boolean().optional(),
});

/**
 * GET /api/user/notifications - Get notification preferences
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.getUserProfile(session.user.id);

    return NextResponse.json({
      notifications: user.notificationPreferences,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/notifications - Update notification preferences
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateNotificationsSchema.parse(body);

    const updatedNotifications = await UserService.updateNotifications(
      session.user.id,
      validatedData
    );

    return NextResponse.json({
      message: 'Notification preferences updated successfully',
      notifications: updatedNotifications,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}