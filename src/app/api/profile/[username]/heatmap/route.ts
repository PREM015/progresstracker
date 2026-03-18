import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import { getClientIp, generateRequestId } from "@/lib/utils";
import { StatsService } from "@/services/statsService";

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: any): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, session ? 100 : 50, `profile:heatmap:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const { username: rawUsername } = await params;
    const username = rawUsername.replace(/^@/, '');

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        isPublic: true,
        showActivity: true, // Assuming heatmap falls under activity visibility
      }
    });

    if (!user) {
      return addHeaders(apiResponse.notFound('User not found', requestId), requestId, rateLimitResult);
    }

    const isSelf = session?.user?.id === user.id;
    if (!isSelf && (!user.isPublic || !user.showActivity)) {
      return addHeaders(apiResponse.forbidden('Activity is private', requestId), requestId, rateLimitResult);
    }

    const yearStr = request.nextUrl.searchParams.get('year');
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

    const heatmap = await StatsService.getHeatmapData(user.id, { year });

    logger.info('GET profile heatmap completed', { username, requestId });

    return addHeaders(apiResponse.success(heatmap, { meta: { requestId } }), requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET profile heatmap failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
