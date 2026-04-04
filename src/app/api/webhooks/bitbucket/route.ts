// src/app/api/webhooks/bitbucket/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyBitbucketSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature.replace('sha256=', '')), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.BITBUCKET_WEBHOOK_SECRET;
  const event = request.headers.get('x-event-key') || 'unknown';
  const body = await request.text();

  if (secret) {
    const signature = request.headers.get('x-hub-signature') || '';
    if (!verifyBitbucketSignature(body, signature, secret)) {
      logger.warn('Bitbucket webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  logger.info('Bitbucket webhook received', { event });

  try {
    switch (event) {
      case 'repo:push': {
        const actor = (payload.actor as { nickname?: string } | null)?.nickname || '';
        const changes = (payload.push as { changes?: unknown[] } | null)?.changes || [];
        const commitCount = changes.reduce((acc: number, change) => {
          const c = change as { commits?: unknown[] };
          return acc + (c?.commits?.length || 0);
        }, 0);

        if (actor && commitCount > 0) {
          const userPlatform = await prisma.userPlatform.findFirst({
            where: { platform: { slug: 'bitbucket' }, platformUsername: actor },
            select: { userId: true },
          });

          if (userPlatform) {
            await prisma.user.update({
              where: { id: userPlatform.userId },
              data: { totalCommits: { increment: commitCount } },
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const platform = await prisma.platform.findFirst({ where: { slug: 'bitbucket' } });
            if (platform) {
              await prisma.trackerEntry.upsert({
                where: { userId_platformId_date: { userId: userPlatform.userId, platformId: platform.id, date: today } },
                create: { userId: userPlatform.userId, platformId: platform.id, date: today, commits: commitCount },
                update: { commits: { increment: commitCount } },
              });
            }
          }
        }
        break;
      }
      case 'pullrequest:fulfilled': {
        const author = (payload.pullrequest as { author?: { nickname?: string } } | null)?.author?.nickname || '';
        if (author) {
          const userPlatform = await prisma.userPlatform.findFirst({
            where: { platform: { slug: 'bitbucket' }, platformUsername: author },
            select: { userId: true },
          });
          if (userPlatform) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const platform = await prisma.platform.findFirst({ where: { slug: 'bitbucket' } });
            if (platform) {
              await prisma.trackerEntry.upsert({
                where: { userId_platformId_date: { userId: userPlatform.userId, platformId: platform.id, date: today } },
                create: { userId: userPlatform.userId, platformId: platform.id, date: today, pullRequests: 1 },
                update: { pullRequests: { increment: 1 } },
              });
            }
          }
        }
        break;
      }
      default:
        logger.info('Unhandled Bitbucket event', { event });
    }

    return NextResponse.json({ received: true, event });
  } catch (err) {
    logger.error('Bitbucket webhook processing error', { event }, err);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ message: 'Bitbucket webhook endpoint active' });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
