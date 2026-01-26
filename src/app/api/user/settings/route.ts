// src/app/api/user/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  autoSync: z.boolean().optional(),
  syncFrequency: z.enum(['hourly', 'daily', 'weekly', 'manual']).optional(),
  publicProfile: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showStats: z.boolean().optional(),
});

/**
 * GET /api/user/settings - Get user settings
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.getUserProfile(session.user.id);

    return NextResponse.json({ settings: user.settings });
  } catch (error) {
    logger.error('Get settings error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/settings - Update user settings
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateSettingsSchema.parse(body);

    const updatedSettings = await UserService.updateSettings(
      session.user.id,
      validatedData
    );

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Update settings error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}