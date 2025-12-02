import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatsService } from '@/services/statsService';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'week'; // week, month, year, all

    let startDate: Date;
    const endDate = endOfDay(new Date());

    switch (period) {
      case 'week':
        startDate = startOfDay(subDays(new Date(), 7));
        break;
      case 'month':
        startDate = startOfDay(subDays(new Date(), 30));
        break;
      case 'year':
        startDate = startOfDay(subDays(new Date(), 365));
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = startOfDay(subDays(new Date(), 7));
    }

    // Get overall summary
    const summary = await StatsService.getSummaryStats(
      session.user.id,
      startDate,
      endDate
    );

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summary stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary statistics' },
      { status: 500 }
    );
  }
}