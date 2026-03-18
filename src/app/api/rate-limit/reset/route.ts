import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import { getClientIp, generateRequestId } from "@/lib/utils";
import { z } from "zod";

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

const resetSchema = z.object({
  token: z.string().min(1)
});

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, `rate-limit:reset:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Must be admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return addHeaders(apiResponse.forbidden('Admin access required', requestId), requestId, rateLimitResult);
    }

    const payload = await request.json();
    const validation = resetSchema.safeParse(payload);

    if (!validation.success) {
      return addHeaders(apiResponse.validationError('Invalid token data', validation.error.errors, requestId), requestId, rateLimitResult);
    }

    // Reset the token in the limiter
    apiRateLimiter.reset(validation.data.token);

    logger.info('POST rate-limit reset completed', { adminId: session.user.id, targetToken: validation.data.token, requestId });

    return addHeaders(apiResponse.success({ message: `Rate limit reset for token: ${validation.data.token}` }, { meta: { requestId } }), requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST rate-limit reset failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
