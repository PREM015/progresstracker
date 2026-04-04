import { NextRequest, NextResponse } from "next/server";
import apiResponse from "@/lib/apiResponse";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const reportTypes = [
      {
        id: 'weekly',
        name: 'Weekly Summary',
        description: 'Your progress over the past week',
        frequency: 'weekly',
        icon: '📊',
        generationTime: 'Every Monday 9:00 AM',
      },
      {
        id: 'monthly',
        name: 'Monthly Report',
        description: 'Comprehensive monthly progress analysis',
        frequency: 'monthly',
        icon: '📈',
        generationTime: 'First day of each month',
      },
      {
        id: 'yearly',
        name: 'Annual Review',
        description: 'Yearly achievement summary and stats',
        frequency: 'yearly',
        icon: '📅',
        generationTime: 'January 1st each year',
      },
      {
        id: 'goal_progress',
        name: 'Goal Progress',
        description: 'Detailed breakdown of goal completion',
        frequency: 'custom',
        icon: '🎯',
        generationTime: 'On demand',
      },
      {
        id: 'platform_activity',
        name: 'Platform Activity',
        description: 'Activity breakdown by platform',
        frequency: 'custom',
        icon: '🔌',
        generationTime: 'On demand',
      },
      {
        id: 'achievement_summary',
        name: 'Achievement Summary',
        description: 'Achievements unlocked and badges earned',
        frequency: 'custom',
        icon: '🏆',
        generationTime: 'On demand',
      },
      {
        id: 'custom',
        name: 'Custom Report',
        description: 'Create a custom report for any date range',
        frequency: 'custom',
        icon: '⚙️',
        generationTime: 'On demand',
      },
    ];

    const response = apiResponse.success({
      types: reportTypes,
      total: reportTypes.length,
      supportedFormats: ['pdf', 'json', 'csv'],
    });

    response.headers.set('Cache-Control', 'public, max-age=3600');
    logger.info('Report types listed');

    return response;
  } catch (error) {
    logger.error('Report types fetch failed', {}, error);
    return apiResponse.internalError('Failed to fetch report types');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
