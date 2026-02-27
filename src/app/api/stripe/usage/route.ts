
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 20;

export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}`;
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Unauthorized', requestId);
    }

    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:usage:${session.user.id}`);
    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Fetch subscription for limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    });

    if (!subscription) {
      return apiResponse.notFound('Subscription not found', requestId);
    }

    // Fetch Usage Counts
    const platformCount = await prisma.userPlatform.count({
      where: { userId: session.user.id, isActive: true }
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Exports this month
    const exportCount = await prisma.exportJob.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: startOfMonth },
        status: 'COMPLETED'
      }
    });

    // API Requests today (mocked or from Redis/Logs if available, using placeholder for now)
    // In a real app, you'd track this in Redis or a DB table
    const apiRequestsCount = 0;

    // Calculate percentages
    const platformLimit = subscription.platformLimit;
    const exportLimit = subscription.exportLimitMonthly;
    const apiLimit = subscription.apiRequestsDaily;

    const usageData = {
      platforms: {
        used: platformCount,
        limit: platformLimit,
        percentage: platformLimit > 0 ? (platformCount / platformLimit) * 100 : 0
      },
      exports: {
        used: exportCount,
        limit: exportLimit,
        percentage: exportLimit > 0 ? (exportCount / exportLimit) * 100 : 0,
        resetsAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1) // Start of next month
      },
      apiRequests: {
        used: apiRequestsCount,
        limit: apiLimit,
        percentage: apiLimit > 0 ? (apiRequestsCount / apiLimit) * 100 : 0,
        resetsAt: new Date(new Date().setHours(24, 0, 0, 0)) // Start of tomorrow
      },
      storage: { // Mocked storage
        used: 0,
        limit: 1000,
        percentage: 0
      }
    };

    return apiResponse.success({ usage: usageData }, { meta: { requestId } });

  } catch (error) {
    logger.error('GET stripe usage failed', { requestId }, error);
    return apiResponse.internalError('Operation failed', requestId);
  }
}
