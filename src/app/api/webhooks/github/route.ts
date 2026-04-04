// src/app/api/webhooks/github/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('GITHUB_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = request.headers.get('x-hub-signature-256') || '';
  const event = request.headers.get('x-github-event') || 'unknown';
  const deliveryId = request.headers.get('x-github-delivery') || '';

  const body = await request.text();
  if (!verifyGitHubSignature(body, signature, secret)) {
    logger.warn('GitHub webhook signature verification failed', { deliveryId });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  logger.info('GitHub webhook received', { event, deliveryId });

  try {
    switch (event) {
      case 'push': {
        const sender = (payload.sender as { login?: string } | null)?.login;
        const repo = (payload.repository as { full_name?: string } | null)?.full_name;
        const commits = (payload.commits as unknown[]) || [];

        if (sender) {
          const userPlatform = await prisma.userPlatform.findFirst({
            where: { platform: { slug: 'github' }, platformUsername: sender },
            select: { userId: true },
          });

          if (userPlatform) {
            // Update commit count
            await prisma.user.update({
              where: { id: userPlatform.userId },
              data: { totalCommits: { increment: commits.length } },
            });

            // Create tracker entry for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const platform = await prisma.platform.findFirst({ where: { slug: 'github' } });

            if (platform) {
              await prisma.trackerEntry.upsert({
                where: { userId_platformId_date: { userId: userPlatform.userId, platformId: platform.id, date: today } },
                create: { userId: userPlatform.userId, platformId: platform.id, date: today, commits: commits.length },
                update: { commits: { increment: commits.length } },
              });
            }

            logger.info('GitHub push processed', { sender, repo, commits: commits.length });
          }
        }
        break;
      }
      case 'pull_request': {
        const action = payload.action as string;
        const sender = (payload.sender as { login?: string } | null)?.login;
        if (action === 'closed' && (payload.pull_request as { merged?: boolean } | null)?.merged && sender) {
          const userPlatform = await prisma.userPlatform.findFirst({
            where: { platform: { slug: 'github' }, platformUsername: sender },
            select: { userId: true },
          });
          if (userPlatform) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const platform = await prisma.platform.findFirst({ where: { slug: 'github' } });
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
        logger.info('Unhandled GitHub event', { event });
    }

    return NextResponse.json({ received: true, event });
  } catch (err) {
    logger.error('GitHub webhook processing error', { event, deliveryId }, err);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ message: 'GitHub webhook endpoint active' });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
