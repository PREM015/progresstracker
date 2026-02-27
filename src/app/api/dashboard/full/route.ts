
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';

import { AnalyticsService } from '@/services/analyticsService';

export async function GET(request: NextRequest) {
    const requestId = `req_dash_${Date.now().toString(36)}`;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return apiResponse.unauthorized('Authentication required', requestId);
        }

        const userId = session.user.id;

        // Use AnalyticsService to get comprehensive data in one go
        const dashboardData = await AnalyticsService.getDashboardData(userId);

        return apiResponse.success(dashboardData, { meta: { requestId } });

    } catch (error) {
        logger.error('GET /api/dashboard/full failed', { requestId }, error);
        return apiResponse.internalError('Failed to fetch dashboard data', requestId);
    }
}
