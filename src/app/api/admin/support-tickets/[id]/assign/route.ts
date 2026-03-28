// src/app/api/admin/support-tickets/[id]/assign/route.ts
// POST: assign ticket to admin

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
    const body = await request.json();
    const parsed = z.object({ assignedTo: z.string().cuid().nullable() }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        assignedTo: parsed.data.assignedTo,
        status: parsed.data.assignedTo ? 'IN_PROGRESS' as any : 'OPEN' as any,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (err) {
    logger.error('POST admin assign ticket failed', {}, err);
    return NextResponse.json({ success: false, error: 'Assignment failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
