import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '365');

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const entries = await prisma.trackerEntry.groupBy({
            by: ['date'],
            where: {
                userId,
                date: { gte: startDate },
            },
            _count: {
                id: true,
            },
            _sum: {
                problemsSolved: true,
            },
        });

        const data = entries.map(entry => ({
            date: entry.date.toISOString().split('T')[0],
            count: entry._sum.problemsSolved || entry._count.id || 0,
        }));

        return NextResponse.json(data);
    } catch (error) {
        console.error('[TRACKER_HEATMAP_GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
