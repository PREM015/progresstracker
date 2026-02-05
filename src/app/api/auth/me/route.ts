// src/app/api/auth/me/route.ts
// Get current authenticated user profile

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 100;

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

async function constantTimeDelay(start: number): Promise<void> {
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, CONSTANT_TIME_MS - elapsed);
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }
}

function secureResponse(body: object, status: number, requestId: string): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set('X-Request-ID', requestId);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.headers.set('Pragma', 'no-cache');
  return res;
}

// =============================================================================
// GET - Get Current User Profile
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitKey = `me:${clientIP}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Not authenticated', code: 'UNAUTHORIZED', user: null },
        401,
        requestId
      );
    }

    const userId = session.user.id;

    // Get full user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        username: true,
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
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
        isActive: true,
        isVerified: true,
        isBanned: true,
        role: true,
        isAdmin: true,
        currentStreak: true,
        longestStreak: true,
        streakFreezeCount: true,
        totalProblems: true,
        totalCommits: true,
        totalProjects: true,
        totalCertifications: true,
        totalAchievements: true,
        totalPoints: true,
        rank: true,
        preferredLanguage: true,
        timezone: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastActiveAt: true,
        twoFactorAuth: {
          select: { isEnabled: true },
        },
        _count: {
          select: {
            platforms: true,
            goals: true,
            achievements: true,
            trackerEntries: true,
          },
        },
      },
    });

    if (!user) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'User not found', code: 'NOT_FOUND', user: null },
        404,
        requestId
      );
    }

    if (!user.isActive || user.isBanned) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Account not active', code: 'ACCOUNT_INACTIVE', user: null },
        403,
        requestId
      );
    }

    // Update last active (non-blocking)
    prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: !!user.emailVerified,
          name: user.name,
          username: user.username,
          image: user.image,
          bio: user.bio,
          location: user.location,
          website: user.website,
          company: user.company,
          jobTitle: user.jobTitle,
          socialLinks: {
            github: user.githubUsername,
            linkedin: user.linkedinUrl,
            twitter: user.twitterHandle,
            discord: user.discordUsername,
          },
          visibility: {
            isPublic: user.isPublic,
            showEmail: user.showEmail,
            showLocation: user.showLocation,
            showActivity: user.showActivity,
            showAchievements: user.showAchievements,
            showGoals: user.showGoals,
            showPlatforms: user.showPlatforms,
            showStreak: user.showStreak,
          },
          role: user.role,
          isAdmin: user.isAdmin,
          isVerified: user.isVerified,
          twoFactorEnabled: user.twoFactorAuth?.isEnabled || false,
          stats: {
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            streakFreezeCount: user.streakFreezeCount,
            totalProblems: user.totalProblems,
            totalCommits: user.totalCommits,
            totalProjects: user.totalProjects,
            totalCertifications: user.totalCertifications,
            totalAchievements: user.totalAchievements,
            totalPoints: user.totalPoints,
            rank: user.rank,
          },
          counts: user._count,
          preferences: {
            language: user.preferredLanguage,
            timezone: user.timezone,
          },
          referralCode: user.referralCode,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          lastActiveAt: user.lastActiveAt,
        },
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Get me error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR', user: null },
      500,
      requestId
    );
  }
}

// =============================================================================
// OTHER METHODS
// =============================================================================

export async function POST(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed. Use PUT to update profile.', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PUT(): Promise<NextResponse> {
  // Redirect to user profile update endpoint
  return secureResponse({ error: 'Use /api/user/profile to update profile', code: 'REDIRECT' }, 308, generateRequestId());
}

export async function PATCH(): Promise<NextResponse> {
  return secureResponse({ error: 'Use /api/user/profile to update profile', code: 'REDIRECT' }, 308, generateRequestId());
}

export async function DELETE(): Promise<NextResponse> {
  return secureResponse({ error: 'Use /api/user/delete to delete account', code: 'REDIRECT' }, 308, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';