// src/app/api/admin/webhooks/[id]/route.ts
// GET/DELETE: manage individual webhook

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface Props { params: Promise<{ id: string }> }

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  if (!session.user.isAdmin && session.user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  return { error: null };
}

export async function GET(_request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        deliveries: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { deliveries: true } },
      },
    });

    if (!webhook) return NextResponse.json({ success: false, error: 'Webhook not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: webhook });
  } catch (err) {
    logger.error('GET admin webhook failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch webhook' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) return NextResponse.json({ success: false, error: 'Webhook not found' }, { status: 404 });

    await prisma.webhook.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Webhook deleted' });
  } catch (err) {
    logger.error('DELETE admin webhook failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to delete webhook' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
