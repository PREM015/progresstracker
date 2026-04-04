// src/app/api/auth/check-username/route.ts
// Check if username is available for registration

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/server/redis-rate-limit';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 150;
const MAX_PAYLOAD_SIZE = 512;

// Reserved usernames
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'info',
  'contact', 'api', 'www', 'mail', 'email', 'account', 'accounts',
  'dashboard', 'settings', 'profile', 'user', 'users', 'login', 'logout',
  'register', 'signup', 'signin', 'auth', 'oauth', 'callback', 'webhook',
  'webhooks', 'null', 'undefined', 'true', 'false', 'test', 'demo',
  'moderator', 'mod', 'staff', 'team', 'official', 'verified', 'bot',
]);

// =============================================================================
// SCHEMAS
// =============================================================================

const CheckUsernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    )
    .transform((u) => u.toLowerCase().trim()),
});

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
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  return res;
}

function generateSuggestions(username: string): string[] {
  const suggestions: string[] = [];
  const base = username.replace(/[0-9]+$/, '');

  for (let i = 0; i < 3; i++) {
    const suffix = Math.floor(Math.random() * 1000);
    suggestions.push(`${base}${suffix}`);
  }

  suggestions.push(`${base}_${Math.floor(Math.random() * 100)}`);
  suggestions.push(`the_${base}`);

  return suggestions.slice(0, 5);
}

async function checkUsernameAvailability(username: string): Promise<{
  available: boolean;
  reason?: string;
  suggestions?: string[];
}> {
  // Check reserved username
  if (RESERVED_USERNAMES.has(username)) {
    return {
      available: false,
      reason: 'reserved',
      suggestions: generateSuggestions(username),
    };
  }

  // Check offensive patterns (basic check)
  const offensivePatterns = [/admin/i, /fuck/i, /shit/i, /damn/i];
  for (const pattern of offensivePatterns) {
    if (pattern.test(username)) {
      return {
        available: false,
        reason: 'inappropriate',
      };
    }
  }

  // To completely prevent user enumeration, we do NOT check the database if the username exists.
  // The actual collision check will happen during the registration submission.
  
  // Return true to satisfy the validation UI. If it's taken, the registration endpoint will handle the error.
  return { available: true };
}

// =============================================================================
// GET - Check username via query parameter
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitResult = await applyRateLimit("enumeration", clientIP);

    if (!rateLimitResult.allowed) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    // Parse query parameter
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    const parsed = CheckUsernameSchema.safeParse({ username });

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message);
      return secureResponse(
        {
          success: false,
          error: errors[0] || 'Invalid username format',
          code: 'VALIDATION_ERROR',
        },
        400,
        requestId
      );
    }

    const result = await checkUsernameAvailability(parsed.data.username);

    await constantTimeDelay(start);

    return secureResponse(
      {
        success: true,
        username: parsed.data.username,
        available: result.available,
        ...(result.reason && { reason: result.reason }),
        ...(result.suggestions && { suggestions: result.suggestions }),
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Check username error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Internal error', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// POST - Check username via body
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitResult = await applyRateLimit("enumeration", clientIP);

    if (!rateLimitResult.allowed) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    // Content-Type validation
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse(
        { success: false, error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' },
        415,
        requestId
      );
    }

    // Parse body
    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_SIZE) {
      return secureResponse(
        { success: false, error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' },
        413,
        requestId
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return secureResponse(
        { success: false, error: 'Invalid JSON', code: 'INVALID_JSON' },
        400,
        requestId
      );
    }

    const parsed = CheckUsernameSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message);
      return secureResponse(
        {
          success: false,
          error: errors[0] || 'Invalid username format',
          code: 'VALIDATION_ERROR',
        },
        400,
        requestId
      );
    }

    const result = await checkUsernameAvailability(parsed.data.username);

    await constantTimeDelay(start);

    return secureResponse(
      {
        success: true,
        username: parsed.data.username,
        available: result.available,
        ...(result.reason && { reason: result.reason }),
        ...(result.suggestions && { suggestions: result.suggestions }),
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Check username error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Internal error', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// OTHER METHODS
// =============================================================================

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
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';