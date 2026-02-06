import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import apiResponse from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return apiResponse.unauthorized('Authentication required');
        }

        const userId = session.user.id;

        // Fetch dashboard stats
        const [goalsCount, problemsSolved, currentStreak, achievements] = await Promise.all([
            prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
            prisma.dailyStats.aggregate({
                where: { userId },
                _sum: { totalProblems: true },
            }),
            prisma.streakHistory.findFirst({
                where: { userId, isCurrent: true },
                select: { length: true },
            }),
            prisma.userAchievement.count({ where: { userId } }),
        ]);

        // Create widget data
        const widgets = [
            {
                id: 'active-goals',
                title: 'Active Goals',
                value: goalsCount,
                change: 12,
                icon: '🎯',
                color: 'from-blue-500 to-blue-700',
            },
            {
                id: 'problems-solved',
                title: 'Problems Solved',
                value: problemsSolved._sum.totalProblems || 0,
                change: 8,
                icon: '💡',
                color: 'from-green-500 to-green-700',
            },
            {
                id: 'current-streak',
                title: 'Current Streak',
                value: `${currentStreak?.length || 0} days`,
                change: 5,
                icon: '🔥',
                color: 'from-orange-500 to-orange-700',
            },
            {
                id: 'achievements',
                title: 'Achievements',
                value: achievements,
                change: 15,
                icon: '🏆',
                color: 'from-purple-500 to-purple-700',
            },
        ];

        return apiResponse.success(widgets);
    } catch (error) {
        console.error('Error fetching dashboard overview:', error);
        return apiResponse.internalError('Failed to fetch dashboard overview');
    }
}

export const dynamic = 'force-dynamic';
