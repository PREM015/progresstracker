// src/app/api/export/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExportService } from '@/services/exportService';
import type { ExportOptions } from '@/types/export';

/**
 * POST /api/export/pdf - Export data as PDF
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
      format: 'pdf',
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

    // Return PDF as downloadable file
    return new NextResponse(result.data as Buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF' },
      { status: 500 }
    );
  }
}