// src/services/analytics/insightsService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { subDays, differenceInDays } from 'date-fns';

const log = logger.child({ service: 'InsightsService' });

export interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'recommendation';
  category: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high';
}

export class InsightsService {
  /**
   * Generate insights for user
   */
  static async generateInsights(userId: string, days: number = 30): Promise<Insight[]> {
    try {
      const startDate = subDays(new Date(), days);
      const insights: Insight[] = [];

      const [entries, goals, user] = await Promise.all([
        prisma.trackerEntry.findMany({
          where: {
            userId,
            date: { gte: startDate },
          },
          orderBy: { date: 'desc' },
        }),
        prisma.goal.findMany({
          where: { userId, status: 'ACTIVE' },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { currentStreak: true, longestStreak: true },
        }),
      ]);

      // Streak insights
      if (user?.currentStreak) {
        if (user.currentStreak >= 7) {
          insights.push({
            type: 'positive',
            category: 'streak',
            title: 'Strong Streak!',
            message: `You're on a ${user.currentStreak}-day streak! Keep it going!`,
            priority: 'high',
            data: { streak: user.currentStreak },
          });
        }

        if (user.currentStreak === user.longestStreak && user.currentStreak > 0) {
          insights.push({
            type: 'positive',
            category: 'streak',
            title: 'Personal Best!',
            message: `This is your longest streak ever at ${user.currentStreak} days!`,
            priority: 'high',
            data: { streak: user.currentStreak },
          });
        }
      }

      // Activity insights
      const uniqueDays = new Set(entries.map((e) => e.date.toISOString().split('T')[0])).size;
      const activityRate = (uniqueDays / days) * 100;

      if (activityRate < 30) {
        insights.push({
          type: 'recommendation',
          category: 'activity',
          title: 'Low Activity',
          message: `You were only active ${uniqueDays} out of ${days} days. Try to increase consistency!`,
          priority: 'medium',
          data: { activeDays: uniqueDays, totalDays: days, rate: activityRate },
        });
      } else if (activityRate > 70) {
        insights.push({
          type: 'positive',
          category: 'activity',
          title: 'Great Consistency!',
          message: `You've been active ${uniqueDays} out of ${days} days. Excellent work!`,
          priority: 'medium',
          data: { activeDays: uniqueDays, totalDays: days, rate: activityRate },
        });
      }

      // Problem-solving trends
      const totalProblems = entries.reduce((s, e) => s + e.problemsSolved, 0);
      const avgProblemsPerDay = uniqueDays > 0 ? totalProblems / uniqueDays : 0;

      if (avgProblemsPerDay > 5) {
        insights.push({
          type: 'positive',
          category: 'problems',
          title: 'High Problem-Solving Rate',
          message: `You're averaging ${avgProblemsPerDay.toFixed(1)} problems per day!`,
          priority: 'medium',
          data: { avgPerDay: avgProblemsPerDay },
        });
      }

      // Goal insights
      const atRiskGoals = goals.filter((g) => {
        if (!g.deadline) return false;
        const daysLeft = differenceInDays(g.deadline, new Date());
        const progressRate = g.progressPercentage;
        return daysLeft < 7 && progressRate < 70;
      });

      if (atRiskGoals.length > 0) {
        insights.push({
          type: 'negative',
          category: 'goals',
          title: 'Goals at Risk',
          message: `You have ${atRiskGoals.length} goal(s) approaching deadline with low progress.`,
          priority: 'high',
          data: { count: atRiskGoals.length },
        });
      }

      // Best day insight
      const problemsByDay = entries.reduce((acc, e) => {
        const dateKey = e.date.toISOString().split('T')[0];
        acc[dateKey] = (acc[dateKey] || 0) + e.problemsSolved;
        return acc;
      }, {} as Record<string, number>);

      const bestDay = Object.entries(problemsByDay).reduce(
        (max, [date, count]) => (count > max.count ? { date, count } : max),
        { date: '', count: 0 }
      );

      if (bestDay.count > 0) {
        insights.push({
          type: 'neutral',
          category: 'performance',
          title: 'Best Day',
          message: `Your most productive day was ${bestDay.date} with ${bestDay.count} problems solved!`,
          priority: 'low',
          data: bestDay,
        });
      }

      log.info('Insights generated', { userId, count: insights.length });

      return insights;
    } catch (error) {
      log.error('Error generating insights', { userId }, error);
      throw error;
    }
  }

  /**
   * Get actionable recommendations
   */
  static async getRecommendations(userId: string): Promise<Insight[]> {
    try {
      const allInsights = await this.generateInsights(userId);
      return allInsights.filter((i) => i.type === 'recommendation');
    } catch (error) {
      log.error('Error getting recommendations', { userId }, error);
      throw error;
    }
  }
}

export default InsightsService;