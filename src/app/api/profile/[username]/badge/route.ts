import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/utils";

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
};

function addHeaders(response: NextResponse, rateLimitResult?: any): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
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
  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 100, `badge:${ip}`);

    if (!rateLimitResult.success) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }

    const { username: rawUsername } = await params;
    const username = rawUsername.replace(/^@/, '');
    const theme = request.nextUrl.searchParams.get('theme') || 'dark';

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        currentStreak: true,
        totalPoints: true,
        totalProblems: true,
        isPublic: true,
      }
    });

    if (!user || !user.isPublic) {
      return new NextResponse('User not found or private', { status: 404 });
    }

    // Generate simple SVG badge based on theme
    const bgColor = theme === 'dark' ? '#1e293b' : '#ffffff';
    const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
    const accentColor = '#3b82f6';
    const width = 300;
    const height = 100;

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" rx="8" fill="${bgColor}" stroke="${accentColor}" stroke-width="2"/>
        <text x="20" y="30" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${textColor}">
          @${user.username}
        </text>
        <rect x="20" y="45" width="80" height="40" rx="4" fill="${theme === 'dark' ? '#334155' : '#f1f5f9'}"/>
        <text x="60" y="65" font-family="Arial, sans-serif" font-size="12" fill="${textColor}" text-anchor="middle">Streak</text>
        <text x="60" y="80" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${accentColor}" text-anchor="middle">${user.currentStreak}</text>

        <rect x="110" y="45" width="80" height="40" rx="4" fill="${theme === 'dark' ? '#334155' : '#f1f5f9'}"/>
        <text x="150" y="65" font-family="Arial, sans-serif" font-size="12" fill="${textColor}" text-anchor="middle">Points</text>
        <text x="150" y="80" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#10b981" text-anchor="middle">${user.totalPoints}</text>

        <rect x="200" y="45" width="80" height="40" rx="4" fill="${theme === 'dark' ? '#334155' : '#f1f5f9'}"/>
        <text x="240" y="65" font-family="Arial, sans-serif" font-size="12" fill="${textColor}" text-anchor="middle">Problems</text>
        <text x="240" y="80" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#8b5cf6" text-anchor="middle">${user.totalProblems}</text>
      </svg>
    `;

    const response = new NextResponse(svg.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    });

    return addHeaders(response, rateLimitResult);
  } catch (error) {
    logger.error('GET badge failed', { error });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
