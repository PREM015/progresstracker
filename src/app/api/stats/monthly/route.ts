import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatsService } from '@/services/statsService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get('months') || '6');

    const monthlyStats = await StatsService.getMonthlyBreakdown(
      session.user.id,
      months
    );

    return NextResponse.json({ monthlyStats });
  } catch (error) {
    console.error('Monthly stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly statistics' },
      { status: 500 }
    );
  }
}