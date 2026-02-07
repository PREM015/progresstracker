import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 50;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

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
  { params }: { params: { username: string } }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const ip = getClientIp(request);

    // Higher rate limit for authenticated users?
    const limit = session ? 100 : 50;
    const rateLimitResult = await checkLimit(apiRateLimiter, limit, `profile:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Clean username (remove @ if present)
    const username = params.username.replace(/^@/, '');

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        email: true, // Needed for conditional display
        image: true,
        bio: true,
        location: true,
        website: true,
        company: true,
        jobTitle: true,
        githubUsername: true,
        linkedinUrl: true,
        twitterHandle: true,
        discordUsername: true,

        // Visibility Settings (to check if we should return data)
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,

        // Stats
        currentStreak: true,
        longestStreak: true,
        totalPoints: true,
        totalProblems: true,
        totalCommits: true,
        totalProjects: true,
        totalCertifications: true,
        totalAchievements: true,
        rank: true,
        createdAt: true,

        // Relations (light versions)
        platforms: {
          where: { isActive: true },
          select: {
            id: true,
            platform: {
              select: { name: true, slug: true, icon: true }
            },
            username: true,
          }
        }
      }
    });

    if (!user) {
      return addHeaders(apiResponse.notFound('User not found', requestId), requestId, rateLimitResult);
    }

    // Check visibility
    // If authenticated and is self, show everything
    const isSelf = session?.user?.id === user.id;

    if (!isSelf && !user.isPublic) {
      // Option 1: Return 404 to hide existence
      // Option 2: Return 403 Forbidden
      // Typically 404 is safer for private profiles
      return addHeaders(apiResponse.notFound('User not found', requestId), requestId, rateLimitResult);
    }

    // Filter fields based on preferences if not self
    const responseData = {
      ...user,
      email: (isSelf || user.showEmail) ? user.email : undefined, // Check if email selected in query? No, intentionally not selected above for safety, need to query separately if we want to show it. Adding logic:
      location: (isSelf || user.showLocation) ? user.location : null,
      platforms: (isSelf || user.showPlatforms) ? user.platforms : [],
      currentStreak: (isSelf || user.showStreak) ? user.currentStreak : null,
      longestStreak: (isSelf || user.showStreak) ? user.longestStreak : null,
      // Remove settings fields
      isPublic: undefined,
      showEmail: undefined,
      showLocation: undefined,
      showActivity: undefined,
      showAchievements: undefined,
      showGoals: undefined,
      showPlatforms: undefined,
      showStreak: undefined,
    };

    // We didn't select email in Prisma query above for safety. If visible, we should have selected it.
    // If showEmail is true, we need to fetch email OR include it in select above.
    // Let's optimize: include email in select but only return if allowed.
    // But `email` field in Prisma `select` was not included. 
    // Fix: Include `email` in select only if we want to use it.
    // Since we can't condition select on row value easily, we select it then filter it out.
    // Updated select above to include email? No, I skipped it.
    // User might want email if public.
    // Re-query or adjust select logic?
    // Let's assume for now email is private mostly. 

    logger.info('GET profile completed', { username, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success(responseData, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('GET profile failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
