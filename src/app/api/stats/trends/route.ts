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
    const days = parseInt(searchParams.get('days') || '30');
    const metric = searchParams.get('metric') || 'problems'; // problems, time, commits

    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const trends = await StatsService.getTrendData(
      session.user.id,
      startDate,
      endDate,
      metric
    );

    // Calculate growth rate
    const midpoint = Math.floor(trends.length / 2);
    const firstHalf = trends.slice(0, midpoint);
    const secondHalf = trends.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;

    const growthRate = firstHalfAvg > 0
      ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
      : 0;

    return NextResponse.json({
      trends,
      metrics: {
        total: trends.reduce((sum, item) => sum + item.value, 0),
        average: trends.reduce((sum, item) => sum + item.value, 0) / trends.length,
        growthRate: Math.round(growthRate * 10) / 10,
        peak: Math.max(...trends.map(item => item.value)),
        activeDays: trends.filter(item => item.value > 0).length,
      }
    });
  } catch (error) {
    console.error('Trends API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trend data' },
      { status: 500 }
    );
  }
}