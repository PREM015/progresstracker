// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserService } from '@/services/userService';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET - Get user settings
export async function GET(request: NextRequest) {
  try {
    // Fixed: was broken template literal with single quotes
    logger.debug(`Fetching user settings for request: ${request.url}`);

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn('Unauthorized settings access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Create default settings if not exist
    if (!settings) {
      logger.info('Creating default settings', { userId: session.user.id });
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          // Schema defaults will be applied automatically:
          // theme: "system", accentColor: "blue", compactMode: false,
          // fontSize: "medium", reducedMotion: false, highContrast: false,
          // language: "en", timezone: "UTC", dateFormat: "MM/DD/YYYY",
          // timeFormat: "12h", weekStartsOn: 0, numberFormat: "en-US",
          // autoSync: true, syncFrequency: "daily", syncOnLogin: true,
          // syncInBackground: true, publicProfile: false, showInLeaderboard: true,
          // allowAnalytics: true, allowCookies: true, keyboardShortcuts: true,
          // soundEffects: false, desktopNotifications: true, dataRetentionDays: 365
        },
      });
    }

    logger.info('Settings fetched successfully', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Settings fetched successfully',
    });
  } catch (error) {
    logger.error('Error fetching settings', {}, error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update all settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    logger.debug('Updating settings', { 
      userId: session.user.id, 
      fields: Object.keys(body) 
    });

    const settings = await UserService.updateSettings(session.user.id, body);

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SETTINGS_CHANGE',
        category: 'user',
        entityType: 'settings',
        entityId: settings.id,
        description: 'Settings updated',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Settings updated successfully', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    logger.error('Error updating settings', {}, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// PATCH - Partial settings update
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    logger.debug('Patching settings', { 
      userId: session.user.id, 
      fields: Object.keys(body) 
    });

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...body,
      },
      update: {
        ...body,
        updatedAt: new Date(),
      },
    });

    logger.info('Settings patched successfully', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Error patching settings', {}, error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// POST - Reset settings to default
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action !== 'reset') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    logger.info('Resetting settings to default', { userId: session.user.id });

    // Delete existing settings (will use defaults)
    await prisma.userSettings.delete({
      where: { userId: session.user.id },
    }).catch(() => {
      // Ignore if doesn't exist
      logger.debug('No existing settings to delete', { userId: session.user.id });
    });

    // Create fresh settings with defaults
    const settings = await prisma.userSettings.create({
      data: {
        userId: session.user.id,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SETTINGS_CHANGE',
        category: 'user',
        description: 'Settings reset to default',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Settings reset successfully', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Settings reset to default',
    });
  } catch (error) {
    logger.error('Error resetting settings', {}, error);
    return NextResponse.json(
      { error: 'Failed to reset settings' },
      { status: 500 }
    );
  }
}