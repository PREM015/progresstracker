// src/app/api/export/json/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { ExportService } from '@/services/exportService';
import type { ExportOptions } from '@/types/export';

/**
 * POST /api/export/json - Export data as JSON
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { startDate, endDate, includeGoals, includeAchievements, includePlatforms, includeStats } = body;

    const options: ExportOptions = {
      format: 'json',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      includeGoals,
      includeAchievements,
      includePlatforms,
      includeStats,
    };

    const result = await ExportService.exportData(session.user.id, options);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      );
    }

    // Return JSON as downloadable file
    return new NextResponse(result.data as string, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    console.error('JSON export error:', error);
    return NextResponse.json(
      { error: 'Failed to export JSON' },
      { status: 500 }
    );
  }
}