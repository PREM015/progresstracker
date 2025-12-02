import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { InsightsService } from '@/services/analytics/insightsService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'week'; // week, month, year

    const insights = await InsightsService.generateInsights(
      session.user.id,
      period as 'week' | 'month' | 'year'
    );

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}