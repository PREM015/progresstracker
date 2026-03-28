// src/app/api/admin/knowledge-base/categories/[id]/route.ts
// GET/PUT/DELETE individual category

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

interface Props { params: Promise<{ id: string }> }

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  if (!session.user.isAdmin && session.user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  return { error: null };
}

export async function GET(_req: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const category = await prisma.knowledgeBaseCategory.findUnique({ where: { id }, include: { articles: { orderBy: { sortOrder: 'asc' } } } });
  if (!category) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: category });
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
    const category = await prisma.knowledgeBaseCategory.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ success: true, data: category });
  } catch (err) {
    logger.error('PUT admin KB category failed', {}, err);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await params;
    await prisma.knowledgeBaseCategory.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (err) {
    logger.error('DELETE admin KB category failed', {}, err);
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
