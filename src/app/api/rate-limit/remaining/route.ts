import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { checkLimit, apiRateLimiter } from "@/lib/rateLimit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Default rate limits per tier
const RATE_LIMITS = {
  free: 100, // 100 requests/hour
  pro: 1000, // 1000 requests/hour
  enterprise: 10000, // 10000 requests/hour
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    // Get user's subscription tier
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscription: {
          select: { tier: true, status: true },
        },
      },
    });

    if (!user) {
      return apiResponse.notFound('User not found');
    }

    const tier = user.subscription?.tier || 'free';
    const limit = RATE_LIMITS[tier as keyof typeof RATE_LIMITS] || RATE_LIMITS.free;

    // Check current rate limit status
    const rateLimitKey = `api:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, limit, rateLimitKey);

    logger.info('Rate limit checked', {
      userId,
      tier,
      limit,
      remaining: rateLimitResult.remaining,
      reset: rateLimitResult.reset,
    });

    return apiResponse.success({
      tier,
      limit,
      remaining: rateLimitResult.remaining,
      used: limit - rateLimitResult.remaining,
      resetAt: new Date(rateLimitResult.reset).toISOString(),
      status: rateLimitResult.success ? 'active' : 'rate_limited',
      documentationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/docs/api/rate-limiting`,
    });
  } catch (error) {
    logger.error('Rate limit check failed', {}, error);
    return apiResponse.internalError('Failed to check rate limit');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
