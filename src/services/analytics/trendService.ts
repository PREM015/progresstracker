import {prisma} from '@/lib/prisma';
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns';

export class TrendService {
  static async calculateTrend(
    userId: string,
    days: number,
    metric: 'problems' | 'time' | 'commits'
  ) {
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const dailyData: Record<string, number> = {};

    entries.forEach((entry) => {
      const dateKey = format(entry.date, 'yyyy-MM-dd');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = 0;
      }

      switch (metric) {
        case 'problems':
          dailyData[dateKey] += entry.problems || 0;
          break;
        case 'time':
          dailyData[dateKey] += entry.timeSpent || 0;
          break;
        case 'commits':
          dailyData[dateKey] += 0; // TODO: Implement
          break;
      }
    });

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    return allDays.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: dateKey,
        value: dailyData[dateKey] || 0,
      };
    });
  }

  static calculateMovingAverage(data: number[], window: number = 7): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const values = data.slice(start, i + 1);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      result.push(Math.round(avg * 10) / 10);
    }
    return result;
  }
}