// app/api/auth/confirm-email-change/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
  return res;
}

export async function GET(req: NextRequest) {
  const start = Date.now();

  try {
    const token = req.nextUrl.searchParams.get('token');
    const type = req.nextUrl.searchParams.get('type'); // 'old' or 'new'

    if (!token || !type || !['old', 'new'].includes(type)) {
      return secureResponse({ error: 'Invalid request' }, 400);
    }

    const tokenHash = hashToken(token);

    const request = await prisma.emailChangeRequest.findFirst({
      where: type === 'old' ? { oldEmailToken: tokenHash } : { newEmailToken: tokenHash },
      include: { user: true },
    });

    if (!request) {
      await constantTimeDelay(start);
      return secureResponse({ error: 'Invalid or expired token' }, 400);
    }

    if (request.expiresAt < new Date() || request.cancelledAt) {
      await constantTimeDelay(start);
      return secureResponse({ error: 'Token expired or request cancelled' }, 400);
    }

    // Update verification status
    if (type === 'old') {
      if (request.oldEmailVerified) {
        return secureResponse({ message: 'Old email already verified' }, 200);
      }
      await prisma.emailChangeRequest.update({
        where: { id: request.id },
        data: { oldEmailVerified: true },
      });
    } else {
      if (!request.oldEmailVerified) {
        return secureResponse({ error: 'Old email must be verified first' }, 400);
      }
      if (request.newEmailVerified) {
        return secureResponse({ message: 'New email already verified' }, 200);
      }
      await prisma.emailChangeRequest.update({
        where: { id: request.id },
        data: { newEmailVerified: true, completedAt: new Date() },
      });

      // Update user email in DB
      await prisma.user.update({
        where: { id: request.userId },
        data: { email: request.newEmail, emailVerified: new Date() },
      });
    }

    await constantTimeDelay(start);
    return secureResponse({ message: 'Email verification successful' }, 200);
  } catch (error) {
    logger.error('Confirm email change error', error);
    await constantTimeDelay(start);
    return secureResponse({ error: 'Something went wrong' }, 500);
  }
};

export async function POST() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function PUT() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function DELETE() { return secureResponse({ error: 'Method not allowed' }, 405); }
