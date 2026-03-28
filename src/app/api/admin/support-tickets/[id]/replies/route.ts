// src/app/api/admin/support-tickets/[id]/replies/route.ts
// GET/POST: admin replies

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

interface Props { params: Promise<{ id: string }> }

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), session: null };
  if (!session.user.isAdmin && session.user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }), session: null };
  return { error: null, session };
}

export async function GET(_request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const replies = await prisma.ticketReply.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, image: true, role: true } } },
    });

    return NextResponse.json({ success: true, data: replies });
  } catch (err) {
    logger.error('GET admin ticket replies failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch replies' }, { status: 500 });
  }
}

const replySchema = z.object({
  message: z.string().min(1).max(10000),
  isInternal: z.boolean().default(false),
});

export async function POST(request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId: session!.user.id,
        message: parsed.data.message,
        isInternal: parsed.data.isInternal,
      },
      include: { user: { select: { id: true, name: true, image: true, role: true } } },
    });

    // Update ticket updatedAt
    await prisma.supportTicket.update({ where: { id }, data: { updatedAt: new Date() } });

    return NextResponse.json({ success: true, data: reply }, { status: 201 });
  } catch (err) {
    logger.error('POST admin ticket reply failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to create reply' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
