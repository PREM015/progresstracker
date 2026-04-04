import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * API Route: /api/export/scheduled/[id]
 * 
 * @description Manage individual scheduled export
 * @created 2026-01-26
 */

const updateSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  format: z.enum(['XLSX', 'XML', 'CSV']).optional(),
  isActive: z.boolean().optional(),
});

// GET - Fetch scheduled export  
export async function GET(
  request: NextRequest, { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const schedule = await prisma.scheduledExport.findUnique({
      where: { id, userId: session.user.id },
    }).catch(() => null);

    if (!schedule) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    logger.info('Scheduled export fetched', { id, userId: session.user.id });
    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    logger.error('GET scheduled export failed', {}, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update scheduled export
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const updated = await prisma.scheduledExport.update({
      where: { id, userId: session.user.id },
      data: validation.data,
    }).catch(() => null);

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    logger.info('Scheduled export updated', { id, userId: session.user.id });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('PUT scheduled export failed', {}, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove scheduled export
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.scheduledExport.delete({
      where: { id, userId: session.user.id },
    }).catch(() => null);

    logger.info('Scheduled export deleted', { id, userId: session.user.id });
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    logger.error('DELETE scheduled export failed', {}, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
