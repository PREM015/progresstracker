import { prisma } from '@/lib/prisma';
import { TrackerEntry } from '@/types/tracker';

export class TrackerService {
  // Get entries for a date range
  static async getEntries(
    userId: string,
    startDate: Date,
    endDate: Date,
    platformId?: string
  ) {
    const where: any = {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (platformId && platformId !== 'all') {
      where.platformId = platformId;
    }

    return await prisma.trackerEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  // Get entry for specific date
  static async getEntryByDate(userId: string, date: Date, platformId?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (platformId) {
      where.platformId = platformId;
    }

    return await prisma.trackerEntry.findFirst({ where });
  }

  // Create entry
  static async createEntry(data: {
    userId: string;
    date: Date;
    platformId?: string;
    problemsSolved?: number;
    timeSpent?: number;
    notes?: string;
  }) {
    return await prisma.trackerEntry.create({
      data: {
        userId: data.userId,
        date: data.date,
        platformId: data.platformId,
        problemsSolved: data.problemsSolved || 0,
        timeSpent: data.timeSpent || 0,
        notes: data.notes,
      },
    });
  }

  // Update entry
  static async updateEntry(
    id: string,
    data: {
      problemsSolved?: number;
      timeSpent?: number;
      notes?: string;
      platformId?: string;
    }
  ) {
    return await prisma.trackerEntry.update({
      where: { id },
      data,
    });
  }

  // Delete entry
  static async deleteEntry(id: string) {
    return await prisma.trackerEntry.delete({
      where: { id },
    });
  }

  // Bulk delete
  static async bulkDelete(ids: string[], userId: string) {
    return await prisma.trackerEntry.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });
  }

  // Get statistics
  static async getStats(userId: string, startDate: Date, endDate: Date) {
    const entries = await this.getEntries(userId, startDate, endDate);

    const totalProblems = entries.reduce((sum, e) => sum + (e.problemsSolved || 0), 0);
    const totalTime = entries.reduce((sum, e) => sum + (e.timeSpent || 0), 0);
    const totalDays = entries.length;

    return {
      totalProblems,
      totalTime,
      totalDays,
      avgProblemsPerDay: totalDays > 0 ? totalProblems / totalDays : 0,
      avgTimePerDay: totalDays > 0 ? totalTime / totalDays : 0,
    };
  }
}