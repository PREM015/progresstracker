// src/app/api/user/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        preferredLanguage: true,
        timezone: true,
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
      },
    });

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        user,
        settings,
      },
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update preferences
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
    const { userPreferences, settingsPreferences } = body;

    // Update user preferences
    if (userPreferences) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          preferredLanguage: userPreferences.preferredLanguage,
          timezone: userPreferences.timezone,
          isPublic: userPreferences.isPublic,
          showEmail: userPreferences.showEmail,
          showLocation: userPreferences.showLocation,
          showActivity: userPreferences.showActivity,
          showAchievements: userPreferences.showAchievements,
          showGoals: userPreferences.showGoals,
          showPlatforms: userPreferences.showPlatforms,
          showStreak: userPreferences.showStreak,
          updatedAt: new Date(),
        },
      });
    }

    // Update settings preferences
    if (settingsPreferences) {
      await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...settingsPreferences,
        },
        update: {
          ...settingsPreferences,
          updatedAt: new Date(),
        },
      });
    }

    // Fetch updated data
    const [user, settings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          preferredLanguage: true,
          timezone: true,
          isPublic: true,
          showEmail: true,
          showLocation: true,
          showActivity: true,
          showAchievements: true,
          showGoals: true,
          showPlatforms: true,
          showStreak: true,
        },
      }),
      prisma.userSettings.findUnique({
        where: { userId: session.user.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { user, settings },
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

// PATCH - Partial update
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
    const { type, data } = body;

    if (type === 'privacy') {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          isPublic: data.isPublic,
          showEmail: data.showEmail,
          showLocation: data.showLocation,
          showActivity: data.showActivity,
          showAchievements: data.showAchievements,
          showGoals: data.showGoals,
          showPlatforms: data.showPlatforms,
          showStreak: data.showStreak,
          updatedAt: new Date(),
        },
      });
    } else if (type === 'localization') {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          preferredLanguage: data.language,
          timezone: data.timezone,
          updatedAt: new Date(),
        },
      });

      await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          language: data.language,
          timezone: data.timezone,
          dateFormat: data.dateFormat,
          timeFormat: data.timeFormat,
        },
        update: {
          language: data.language,
          timezone: data.timezone,
          dateFormat: data.dateFormat,
          timeFormat: data.timeFormat,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated',
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}