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

        // Get all platforms with user connection status
        const platforms = await prisma.platform.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
                color: true,
                category: true,
                users: {
                    where: { userId },
                    select: {
                        id: true,
                        connectionStatus: true,
                        lastSyncedAt: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        // Transform data for frontend
        const platformsData = platforms.map(platform => {
            const userPlatform = platform.users[0];
            return {
                id: platform.id,
                name: platform.name,
                icon: platform.icon || '🌐',
                connected: userPlatform?.connectionStatus === 'connected',
                lastSync: userPlatform?.lastSyncedAt?.toISOString() || new Date().toISOString(),
                itemsCount: 0, // Metric not available in simple view
            };
        });

        return apiResponse.success({ platforms: platformsData });
    } catch (error) {
        console.error('Error fetching platforms summary:', error);
        return apiResponse.internalError('Failed to fetch platforms summary');
    }
}

export const dynamic = 'force-dynamic';
