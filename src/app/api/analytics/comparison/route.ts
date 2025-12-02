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

    const comparison = await StatsService.getWeeklyComparison(session.user.id);

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error('Comparison API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison data' },
      { status: 500 }
    );
  }
}