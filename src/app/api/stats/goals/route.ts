import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { GoalService } from '@/services/goalService';
import { logger } from '@/lib/logger';

const RATE_LIMIT = 20;

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return apiResponse.unauthorized('Unauthorized', requestId);
        }

        const userId = session.user.id;
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:goals:${userId}`);

        if (!rateLimitResult.success) {
            return apiResponse.rateLimited(60, requestId);
        }

        const stats = await GoalService.getGoalStats(userId);

        return apiResponse.success(stats, { meta: { requestId } });

    } catch (error) {
        logger.error('GET stats goals failed', { requestId }, error);
        return apiResponse.internalError('Operation failed', requestId);
    }
}
