import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import { getClientIp, generateRequestId } from "@/lib/utils";

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'public, max-age=3600',
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
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 50, `embed:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const { username: rawUsername } = await params;
    const username = rawUsername.replace(/^@/, '');

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        name: true,
        bio: true,
        image: true,
        isPublic: true,
        currentStreak: true,
        totalPoints: true,
      }
    });

    if (!user || !user.isPublic) {
      return addHeaders(apiResponse.notFound('User not found or private', requestId), requestId, rateLimitResult);
    }

    // Usually an embed provides the oEmbed JSON standard format or an iframe code. We provide oEmbed JSON.
    const embedData = {
      type: "rich",
      version: "1.0",
      title: `${user.name || user.username}'s ProgressTracker Profile`,
      author_name: user.username,
      author_url: `https://progresstracker.app/u/${user.username}`,
      provider_name: "ProgressTracker",
      provider_url: "https://progresstracker.app",
      thumbnail_url: user.image || "https://progresstracker.app/default-avatar.png",
      description: user.bio || `Check out @${user.username}'s progress! Streak: ${user.currentStreak} 🔥 Points: ${user.totalPoints} 💎`,
      html: `<iframe src="https://progresstracker.app/embed/u/${user.username}" width="400" height="200" style="border:none;border-radius:8px;" allowtransparency="true"></iframe>`
    };

    logger.info('GET profile embed completed', { username, requestId });

    return addHeaders(apiResponse.success(embedData, { meta: { requestId } }), requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET profile embed failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
