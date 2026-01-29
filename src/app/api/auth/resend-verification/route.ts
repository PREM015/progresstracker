import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rateLimit';

const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const MAX_PAYLOAD_SIZE = 2048;
const TOKEN_EXPIRY_MS = 1000 * 60 * 60;
const CONSTANT_TIME_MS = 250;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function constantTimeDelay(start: number) {
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, CONSTANT_TIME_MS - elapsed);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

function secureResponse(body: object, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse({ error: 'Content-Type must be application/json' }, 415);
    }

    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_SIZE) return secureResponse({ error: 'Payload too large' }, 413);

    let body: unknown;
    try { body = JSON.parse(raw); } catch { return secureResponse({ error: 'Invalid JSON' }, 400); }

    const parsed = ResendVerificationSchema.safeParse(body);
    if (!parsed.success) return secureResponse({ error: 'Invalid request payload' }, 400);

    const { email } = parsed.data;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key = `resend-verification:${email}:${ip}`;

    // Adjusted rateLimit usage
    const allowed = await rateLimit(key, 5, 60 * 1000, { interval: 60 * 1000, uniqueTokenPerInterval: 500 }).check(5, key);
    if (!allowed.success) return secureResponse({ error: 'Too many requests. Try later.' }, 429);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerified) {
      await constantTimeDelay(start);
      return secureResponse({ message: 'If an account exists, a verification email was sent.' }, 200);
    }

    const token = crypto.randomBytes(48).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email!,
        token: tokenHash,
        expiresAt,
        type: 'verification',
      },
    });

    // TODO: send email
    // await sendVerificationEmail(user.email, token);

    await constantTimeDelay(start);
    return secureResponse({ message: 'If an account exists, a verification email was sent.' }, 200);
  } catch (error) {
    logger.error('Resend verification error', { error });
    await constantTimeDelay(start);
    return secureResponse({ error: 'Something went wrong' }, 500);
  }
}

export async function GET() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function PUT() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function DELETE() { return secureResponse({ error: 'Method not allowed' }, 405); }
