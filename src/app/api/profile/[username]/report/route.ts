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

const reportSchema = z.object({
  reason: z.string().min(10).max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 10, `profile:report:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const { username: rawUsername } = await params;
    const username = rawUsername.replace(/^@/, '');

    const payload = await request.json();
    const validation = reportSchema.safeParse(payload);

    if (!validation.success) {
      return addHeaders(apiResponse.validationError('Invalid report data', validation.error.errors, requestId), requestId, rateLimitResult);
    }

    const targetUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true }
    });

    if (!targetUser) {
      return addHeaders(apiResponse.notFound('User not found', requestId), requestId, rateLimitResult);
    }

    // Since 'Report' model schema allows string 'type' and 'description'
    // Log as feedback since exact report model isn't matching
    await prisma.feedback.create({
      data: {
        userId: session.user.id,
        message: `Report User ${targetUser.username}: ${validation.data.reason}`,
        type: "REPORT",
      }
    });

    logger.info('POST profile report completed', { username, requestId });

    return addHeaders(apiResponse.success({ message: 'Report submitted successfully' }, { meta: { requestId } }), requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST profile report failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
