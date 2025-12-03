import { prisma } from '@/lib/prisma'
import {
  subDays,
  startOfDay,
  endOfDay,
  format,
  eachDayOfInterval,
} from 'date-fns'

export class StatsService {
  // ======================================================
  // OVERALL STATS
  // ======================================================
  static async getOverallStats(userId: string, days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days))
    const endDate = endOfDay(new Date())

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'desc' },
    })

    const totalProblems = entries.reduce(
      (sum, e) => sum + (e.problemsSolved ?? 0),
      0
    )

    const totalTime = entries.reduce(
      (sum, e) => sum + (e.timeSpent ?? 0),
      0
    )

    const uniqueDays = new Set(
      entries.map(e => format(e.date, 'yyyy-MM-dd'))
    ).size

    const streak = await this.calculateStreak(userId)

    const platformStats = await this.getPlatformBreakdown(
      userId,
      startDate,
      endDate
    )

    const recentActivity = entries.slice(0, 10).map(entry => ({
      id: entry.id,
      date: entry.date,
      platformId: entry.platformId,
      problemsSolved: entry.problemsSolved,
      timeSpent: entry.timeSpent,
      notes: entry.notes,
    }))

    return {
      totalProblems,
      totalTime,
      activeDays: uniqueDays,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      avgProblemsPerDay:
        uniqueDays > 0 ? Math.round(totalProblems / uniqueDays) : 0,
      avgTimePerDay:
        uniqueDays > 0 ? Math.round(totalTime / uniqueDays) : 0,
      platformStats,
      recentActivity,
    }
  }

  // ======================================================
  // STREAK CALCULATION
  // ======================================================
  static async calculateStreak(userId: string) {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    })

    if (!entries.length) return { current: 0, longest: 0 }

    const uniqueDates = [
      ...new Set(entries.map(e => format(e.date, 'yyyy-MM-dd'))),
    ]

    let current = 0
    let longest = 1
    let temp = 1

    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      current = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        const expected = format(
          subDays(new Date(uniqueDates[i - 1]), 1),
          'yyyy-MM-dd'
        )
        if (uniqueDates[i] === expected) current++
        else break
      }
    }

    for (let i = 1; i < uniqueDates.length; i++) {
      const expected = format(
        subDays(new Date(uniqueDates[i - 1]), 1),
        'yyyy-MM-dd'
      )
      if (uniqueDates[i] === expected) {
        temp++
        longest = Math.max(longest, temp)
      } else {
        temp = 1
      }
    }

    return { current, longest }
  }

  // ======================================================
  // PLATFORM BREAKDOWN
  // ======================================================
  static async getPlatformBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        platformId: { not: null },
      },
    })

    const breakdown: Record<
      string,
      { problems: number; time: number; count: number }
    > = {}

    entries.forEach(entry => {
      const key = entry.platformId!
      if (!breakdown[key]) {
        breakdown[key] = { problems: 0, time: 0, count: 0 }
      }
      breakdown[key].problems += entry.problemsSolved ?? 0
      breakdown[key].time += entry.timeSpent ?? 0
      breakdown[key].count++
    })

    return Object.entries(breakdown)
      .map(([platformId, stats]) => ({
        platformId,
        ...stats,
      }))
      .sort((a, b) => b.problems - a.problems)
  }

  // ======================================================
  // MONTHLY BREAKDOWN
  // ======================================================
  static async getMonthlyBreakdown(userId: string, months: number = 6) {
    const startDate = startOfDay(subDays(new Date(), months * 30))
    const endDate = endOfDay(new Date())

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    })

    const monthly: Record<
      string,
      { problems: number; time: number; days: Set<string> }
    > = {}

    entries.forEach(entry => {
      const key = format(entry.date, 'yyyy-MM')
      if (!monthly[key]) {
        monthly[key] = { problems: 0, time: 0, days: new Set() }
      }
      monthly[key].problems += entry.problemsSolved ?? 0
      monthly[key].time += entry.timeSpent ?? 0
      monthly[key].days.add(format(entry.date, 'yyyy-MM-dd'))
    })

    return Object.entries(monthly)
      .map(([month, data]) => ({
        month,
        problems: data.problems,
        time: data.time,
        activeDays: data.days.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  // ======================================================
  // HEATMAP (365 DAYS)
  // ======================================================
  static async getHeatmapData(userId: string) {
    const startDate = startOfDay(subDays(new Date(), 365))
    const endDate = endOfDay(new Date())

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    })

    const daily: Record<string, number> = {}

    entries.forEach(entry => {
      const key = format(entry.date, 'yyyy-MM-dd')
      daily[key] = (daily[key] || 0) + (entry.problemsSolved ?? 0)
    })

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })

    return allDays.map(day => {
      const key = format(day, 'yyyy-MM-dd')
      return { date: key, count: daily[key] || 0 }
    })
  }

  // ======================================================
  // SUMMARY STATS
  // ======================================================
  static async getSummaryStats(userId: string, startDate: Date, endDate: Date) {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
    })

    const totalProblems = entries.reduce(
      (s, e) => s + (e.problemsSolved ?? 0),
      0
    )

    const totalTime = entries.reduce(
      (s, e) => s + (e.timeSpent ?? 0),
      0
    )

    const activeDays = new Set(
      entries.map(e => format(e.date, 'yyyy-MM-dd'))
    ).size

    const connectedPlatforms = await prisma.userPlatform.count({
      where: { userId },
    })

    const activeGoals = await prisma.goal.count({
      where: { userId, completedAt: null },
    })

    const achievementsUnlocked = await prisma.userAchievement.count({
      where: { userId },
    })

    const streak = await this.calculateStreak(userId)

    return {
      totalProblems,
      totalTime,
      activeDays,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      connectedPlatforms,
      activeGoals,
      achievementsUnlocked,
      avgProblemsPerDay:
        activeDays > 0 ? Math.round(totalProblems / activeDays) : 0,
      avgTimePerDay:
        activeDays > 0 ? Math.round(totalTime / activeDays) : 0,
      periodStart: startDate,
      periodEnd: endDate,
    }
  }

  // ======================================================
  // TREND DATA
  // ======================================================
  static async getTrendData(
    userId: string,
    startDate: Date,
    endDate: Date,
    metric: 'problems' | 'time' | 'commits' = 'problems'
  ) {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
    })

    const daily: Record<string, number> = {}

    entries.forEach(entry => {
      const key = format(entry.date, 'yyyy-MM-dd')
      if (!daily[key]) daily[key] = 0

      if (metric === 'problems') daily[key] += entry.problemsSolved ?? 0
      if (metric === 'time') daily[key] += entry.timeSpent ?? 0
    })

    const days = eachDayOfInterval({ start: startDate, end: endDate })

    return days.map(d => ({
      date: format(d, 'yyyy-MM-dd'),
      value: daily[format(d, 'yyyy-MM-dd')] || 0,
    }))
  }

  // ======================================================
  // WEEKLY COMPARISON
  // ======================================================
  static async getWeeklyComparison(userId: string) {
    const now = new Date()
    const thisWeekStart = startOfDay(subDays(now, 7))
    const lastWeekStart = startOfDay(subDays(now, 14))
    const lastWeekEnd = endOfDay(subDays(now, 7))

    const [thisWeek, lastWeek] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: thisWeekStart } },
      }),
      prisma.trackerEntry.findMany({
        where: { userId, date: { gte: lastWeekStart, lte: lastWeekEnd } },
      }),
    ])

    const sum = (arr: typeof thisWeek) =>
      arr.reduce((s, e) => s + (e.problemsSolved ?? 0), 0)

    return {
      thisWeek: sum(thisWeek),
      lastWeek: sum(lastWeek),
      change:
        lastWeek.length > 0 ? ((sum(thisWeek) - sum(lastWeek)) / sum(lastWeek)) * 100 : 0,
    }
  }

  // ======================================================
  // PLATFORM TRENDS
  // ======================================================
  static async getPlatformTrends(userId: string, days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days))

    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId,
        date: { gte: startDate },
        platformId: { not: null },
      },
    })

    const map: Record<string, Record<string, number>> = {}

    entries.forEach(e => {
      const platform = e.platformId!
      const dateKey = format(e.date, 'yyyy-MM-dd')

      map[platform] ??= {}
      map[platform][dateKey] =
        (map[platform][dateKey] || 0) + (e.problemsSolved ?? 0)
    })

    return Object.entries(map).map(([platformId, dates]) => ({
      platformId,
      total: Object.values(dates).reduce((a, b) => a + b, 0),
      data: Object.entries(dates).map(([date, value]) => ({
        date,
        value,
      })),
    }))
  }
}
