// src/app/api/webhooks/gitlab/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.GITLAB_WEBHOOK_SECRET;
  const token = request.headers.get('x-gitlab-token');
  const event = request.headers.get('x-gitlab-event') || 'unknown';

  if (secret && token !== secret) {
    logger.warn('GitLab webhook token mismatch');
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  logger.info('GitLab webhook received', { event });

  try {
    switch (event) {
      case 'Push Hook': {
        const username = (payload.user_username as string) || '';
        const commits = (payload.commits as unknown[]) || [];

        if (username && commits.length > 0) {
          const userPlatform = await prisma.userPlatform.findFirst({
            where: { platform: { slug: 'gitlab' }, platformUsername: username },
            select: { userId: true },
          });

          if (userPlatform) {
            await prisma.user.update({
              where: { id: userPlatform.userId },
              data: { totalCommits: { increment: commits.length } },
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const platform = await prisma.platform.findFirst({ where: { slug: 'gitlab' } });
            if (platform) {
              await prisma.trackerEntry.upsert({
                where: { userId_platformId_date: { userId: userPlatform.userId, platformId: platform.id, date: today } },
                create: { userId: userPlatform.userId, platformId: platform.id, date: today, commits: commits.length },
                update: { commits: { increment: commits.length } },
              });
            }
          }
        }
        break;
      }
      case 'Merge Request Hook': {
        const attrs = payload.object_attributes as { state?: string; action?: string } | undefined;
        const username = (payload.user as { username?: string } | null)?.username || '';
        if (attrs?.state === 'merged' && username) {
          const userPlatform = await prisma.userPlatform.findFirst({
            where: { platform: { slug: 'gitlab' }, platformUsername: username },
            select: { userId: true },
          });
          if (userPlatform) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const platform = await prisma.platform.findFirst({ where: { slug: 'gitlab' } });
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
        logger.info('Unhandled GitLab event', { event });
    }

    return NextResponse.json({ received: true, event });
  } catch (err) {
    logger.error('GitLab webhook processing error', { event }, err);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ message: 'GitLab webhook endpoint active' });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
