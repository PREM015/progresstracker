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
    
    // Check limit for checking limits! 
    const rateLimitResult = await checkLimit(apiRateLimiter, session ? 100 : 50, `rate-limit:info:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const data = {
      message: "Rate limit information",
      policies: {
        public: "50 requests per minute",
        authenticated: "100 requests per minute",
        sync: "10 requests per hour",
        auth: "5 requests per 5 minutes"
      },
      currentLimit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
      resetAt: new Date(rateLimitResult.reset).toISOString()
    };

    logger.info('GET rate-limit info completed', { ip, requestId });

    return addHeaders(apiResponse.success(data, { meta: { requestId } }), requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET rate-limit info failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
