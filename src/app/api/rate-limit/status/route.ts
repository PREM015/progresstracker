import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import { getClientIp, generateRequestId } from "@/lib/utils";

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
  request: NextRequest
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    const ip = getClientIp(request);
    
    // Consume 1 token to check current status for this IP
    const rateLimitResult = await checkLimit(apiRateLimiter, session ? 100 : 50, `rate-limit:status:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Could aggregate total hit metrics if provided by cache, but LRU doesn't expose keys easily
    // We return standard active status
    const data = {
      status: "active",
      provider: "lru-cache",
      strategy: "token-bucket-sliding-window",
      ip,
      currentUsage: {
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetAt: new Date(rateLimitResult.reset).toISOString()
      }
    };

    logger.info('GET rate-limit status completed', { ip, requestId });

    return addHeaders(apiResponse.success(data, { meta: { requestId } }), requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET rate-limit status failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
