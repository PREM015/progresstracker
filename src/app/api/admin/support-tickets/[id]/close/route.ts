// src/app/api/admin/support-tickets/[id]/close/route.ts
// POST: close ticket

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

interface Props { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Props): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!session.user.isAdmin && session.user.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = z.object({ resolution: z.string().max(5000).optional() }).safeParse(body);

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'CLOSED' as any,
        resolution: parsed.success ? parsed.data.resolution : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (err) {
    logger.error('POST admin close ticket failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to close ticket' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
