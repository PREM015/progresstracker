// src/app/api/admin/knowledge-base/articles/[id]/route.ts
// GET/PUT/DELETE individual article

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
  const article = await prisma.knowledgeBaseArticle.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
  if (!article) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: article });
}

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(1000).optional(),
  categoryId: z.string().cuid().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  isFeatured: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  readTimeMinutes: z.number().int().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
    const { status, ...rest } = parsed.data;
    const article = await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: { ...rest, ...(status ? { status: status as any } : {}) },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    return NextResponse.json({ success: true, data: article });
  } catch (err) {
    logger.error('PUT admin KB article failed', {}, err);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Props): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await params;
    await prisma.knowledgeBaseArticle.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (err) {
    logger.error('DELETE admin KB article failed', {}, err);
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
