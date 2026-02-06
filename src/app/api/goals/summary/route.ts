import { NextRequest, NextResponse } from 'next/server';
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

        // Get all goals for the user
        const goals = await prisma.goal.findMany({
            where: { userId },
            select: {
                id: true,
                title: true,
                status: true,
                progress: true,
                target: true,
                progressPercentage: true,
                deadline: true,
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Calculate summary statistics
        const total = goals.length;
        const completed = goals.filter(g => g.status === 'COMPLETED').length;
        const active = goals.filter(g => g.status === 'ACTIVE').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Get recent goals (last 5 active or in-progress)
        const recentGoals = goals
            .filter(g => g.status === 'ACTIVE')
            .slice(0, 5)
            .map(g => ({
                id: g.id,
                title: g.title,
                progress: g.progressPercentage || 0,
                deadline: g.deadline?.toISOString() || null,
            }));

        return apiResponse.success({
            total,
            completed,
            active,
            completionRate,
            recentGoals,
        });
    } catch (error) {
        console.error('Error fetching goals summary:', error);
        return apiResponse.internalError('Failed to fetch goals summary');
    }
}

export const dynamic = 'force-dynamic';
