// src/app/api/admin/support-tickets/[id]/route.ts
// GET/PUT: ticket detail + update

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
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, image: true, role: true } } },
        },
      },
    });

    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: ticket });
  } catch (err) {
    logger.error('GET admin support ticket failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch ticket' }, { status: 500 });
  }
}

const updateSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
  resolution: z.string().max(5000).optional(),
  internalNotes: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });

    const { status, priority, ...rest } = parsed.data;
    const data: any = { ...rest, updatedAt: new Date() };
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (status === 'RESOLVED' && !data.resolvedAt) data.resolvedAt = new Date();

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (err) {
    logger.error('PUT admin support ticket failed', {}, err);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
