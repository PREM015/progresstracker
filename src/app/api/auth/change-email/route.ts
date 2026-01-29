// app/api/auth/change-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email'; // <-- You need a generic email sender function

const ChangeEmailSchema = z.object({
  oldEmail: z.string().email('Invalid old email'),
  newEmail: z.string().email('Invalid new email'),
});

const CONSTANT_TIME_MS = 250;
const MAX_PAYLOAD_SIZE = 1024;

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

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse({ error: 'Content-Type must be application/json' }, 415);
    }

    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_SIZE) return secureResponse({ error: 'Payload too large' }, 413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return secureResponse({ error: 'Invalid JSON' }, 400);
    }

    const parsed = ChangeEmailSchema.safeParse(body);
    if (!parsed.success) return secureResponse({ error: 'Invalid request payload' }, 400);

    const { oldEmail, newEmail } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email: oldEmail } });
    if (!user) {
      await constantTimeDelay(start);
      return secureResponse({ message: 'If an account exists, an email change request was sent.' }, 200);
    }

    if (oldEmail === newEmail) {
      return secureResponse({ error: 'New email must be different from old email' }, 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existingUser) {
      return secureResponse({ error: 'Email already in use' }, 409);
    }

    const oldEmailToken = crypto.randomBytes(48).toString('hex');
    const newEmailToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.emailChangeRequest.create({
      data: {
        userId: user.id,
        oldEmail,
        newEmail,
        oldEmailToken: hashToken(oldEmailToken),
        newEmailToken: hashToken(newEmailToken),
        expiresAt,
      },
    });

    // === SEND EMAILS ===
    try {
      await sendEmail({
        to: oldEmail,
        subject: 'Confirm your email change (old email)',
        html: `<p>Hello ${user.name || 'User'},</p>
               <p>We received a request to change your email to <strong>${newEmail}</strong>.</p>
               <p>Click the link below to confirm you want to keep your old email:</p>
               <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm-email-change?token=${oldEmailToken}&type=old">Confirm Old Email</a></p>
               <p>If you did not request this change, ignore this email.</p>`,
      });

      await sendEmail({
        to: newEmail,
        subject: 'Confirm your new email',
        html: `<p>Hello ${user.name || 'User'},</p>
               <p>You requested to change your email from <strong>${oldEmail}</strong> to this email.</p>
               <p>Click the link below to confirm your new email:</p>
               <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm-email-change?token=${newEmailToken}&type=new">Confirm New Email</a></p>
               <p>If you did not request this change, ignore this email.</p>`,
      });
    } catch (emailError) {
      logger.error('Failed to send change email notifications', { emailError });
    }

    await constantTimeDelay(start);
    return secureResponse({ message: 'If an account exists, an email change request was sent.' }, 200);
  } catch (error) {
    logger.error('Change email error', { error });
    await constantTimeDelay(start);
    return secureResponse({ error: 'Something went wrong' }, 500);
  }
}

export async function GET() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function PUT() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function DELETE() { return secureResponse({ error: 'Method not allowed' }, 405); }
