import {prisma }from '@/lib/prisma';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

interface Insight {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  icon: string;
}

export class InsightsService {
  static async generateInsights(
    userId: string,
    period: 'week' | 'month' | 'year'
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Get entries
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'desc' },
    });

    if (entries.length === 0) {
      insights.push({
        type: 'warning',
        title: 'No Activity Detected',
        description: `You haven't logged any activity in the past ${period}. Start tracking to see insights!`,
        icon: '📊',
      });
      return insights;
    }

    // Calculate metrics
    const totalProblems = entries.reduce((sum, e) => sum + (e.problemsSolved || 0), 0);
    const totalTime = entries.reduce((sum, e) => sum + (e.timeSpent || 0), 0);
    const avgProblems = totalProblems / days;
    const avgTime = totalTime / days;

    // Insight 1: Productivity Level
    if (avgProblems >= 5) {
      insights.push({
        type: 'success',
        title: '🔥 High Productivity!',
        description: `You're solving an average of ${avgProblems.toFixed(1)} problems per day. Keep up the excellent work!`,
        icon: '⚡',
      });
    } else if (avgProblems >= 2) {
      insights.push({
        type: 'info',
        title: '📈 Steady Progress',
        description: `You're averaging ${avgProblems.toFixed(1)} problems per day. Try pushing for 5+ to boost your skills!`,
        icon: '💪',
      });
    } else {
      insights.push({
        type: 'warning',
        title: '⚠️ Low Activity',
        description: `Only ${avgProblems.toFixed(1)} problems per day. Set a goal of 3-5 problems daily for better progress.`,
        icon: '📉',
      });
    }

    // Insight 2: Time Invested
    const hoursPerDay = avgTime / 60;
    if (hoursPerDay >= 2) {
      insights.push({
        type: 'success',
        title: '⏰ Great Time Investment',
        description: `You're spending ${hoursPerDay.toFixed(1)} hours per day. This consistency will pay off!`,
        icon: '🎯',
      });
    } else if (hoursPerDay >= 1) {
      insights.push({
        type: 'info',
        title: '⏳ Moderate Time Investment',
        description: `${hoursPerDay.toFixed(1)} hours daily is good. Try extending to 2+ hours for faster growth.`,
        icon: '📚',
      });
    }

    // Insight 3: Streak Analysis
    const dates = entries.map(e => format(e.date, 'yyyy-MM-dd'));
    const uniqueDates = [...new Set(dates)].sort();
    
    let currentStreak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const expectedDate = format(subDays(new Date(uniqueDates[i - 1]), 1), 'yyyy-MM-dd');
        if (uniqueDates[i] === expectedDate) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    if (currentStreak >= 7) {
      insights.push({
        type: 'success',
        title: '🔥 Amazing Streak!',
        description: `${currentStreak} days in a row! You're building an incredible habit. Don't break the chain!`,
        icon: '🎉',
      });
    } else if (currentStreak >= 3) {
      insights.push({
        type: 'info',
        title: '📅 Streak Building',
        description: `${currentStreak} day streak. Keep going to build consistency and momentum!`,
        icon: '🌟',
      });
    } else if (currentStreak === 0) {
      insights.push({
        type: 'tip',
        title: '💡 Start a Streak',
        description: 'Consistency is key! Try coding for just 30 minutes daily to build a habit.',
        icon: '🚀',
      });
    }

    // Insight 4: Platform Diversity
    const platforms = new Set(entries.map(e => e.platform).filter(Boolean));
    if (platforms.size >= 3) {
      insights.push({
        type: 'success',
        title: '🌐 Great Platform Diversity',
        description: `You're active on ${platforms.size} platforms. This breadth is excellent for skill development!`,
        icon: '🎨',
      });
    } else if (platforms.size === 1) {
      insights.push({
        type: 'tip',
        title: '📌 Try More Platforms',
        description: 'Exploring different platforms can expose you to diverse problem types and learning styles.',
        icon: '🔄',
      });
    }

    // Insight 5: Best Day
    const dayActivity: Record<string, number> = {};
    entries.forEach(entry => {
      const day = format(entry.date, 'EEEE');
      dayActivity[day] = (dayActivity[day] || 0) + (entry.problemsSolved || 0);
    });

    const bestDay = Object.entries(dayActivity).sort((a, b) => b[1] - a[1])[0];
    if (bestDay) {
      insights.push({
        type: 'info',
        title: `📊 Your Peak Day: ${bestDay[0]}`,
        description: `You solve most problems on ${bestDay[0]}s (${bestDay[1]} problems). Plan important work on this day!`,
        icon: '📈',
      });
    }

    return insights;
  }
}