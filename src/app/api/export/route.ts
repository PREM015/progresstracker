// src/app/api/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/export - Get export options and metadata
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      formats: ['csv', 'json', 'pdf'],
      options: {
        includeGoals: true,
        includeAchievements: true,
        includePlatforms: true,
        includeStats: true,
      },
    });
  } catch (error) {
    console.error('Get export options error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export options' },
      { status: 500 }
    );
  }
}