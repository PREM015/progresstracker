// src/app/api/auth/providers/route.ts
// List available OAuth providers

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 50;

// Provider configurations
const PROVIDERS = [
  {
    id: 'google',
    name: 'Google',
    icon: 'google',
    color: '#4285F4',
    enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'github',
    color: '#24292E',
    enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: 'discord',
    color: '#5865F2',
    enabled: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    enabled: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
  },
];

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
  res.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
  return res;
}

// =============================================================================
// GET - List Available Providers
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitKey = `providers:${clientIP}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    // Filter to only enabled providers
    const enabledProviders = PROVIDERS.filter((p) => p.enabled).map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      color: p.color,
    }));

    // Check if credentials login is enabled
    const credentialsEnabled = true; // Always enabled in your setup

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        providers: enabledProviders,
        credentialsEnabled,
        total: enabledProviders.length,
        authMethods: {
          email: credentialsEnabled,
          oauth: enabledProviders.length > 0,
          magicLink: false, // Set to true if you enable magic link
        },
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Get providers error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// OTHER METHODS
// =============================================================================

export async function POST(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PUT(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PATCH(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function DELETE(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';