// src/app/api/admin/knowledge-base/articles/route.ts
// GET/POST articles

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), session: null };
  if (!session.user.isAdmin && session.user.role !== 'admin') return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }), session: null };
  return { error: null, session };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Number(searchParams.get('limit') || 20));
    const status = searchParams.get('status') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const search = searchParams.get('search') || undefined;

    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ];

    const [articles, total] = await Promise.all([
      prisma.knowledgeBaseArticle.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.knowledgeBaseArticle.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: { articles, total, page, limit } });
  } catch (err) {
    logger.error('GET admin KB articles failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch articles' }, { status: 500 });
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).optional(),
  content: z.string().min(1),
  excerpt: z.string().max(1000).optional(),
  categoryId: z.string().cuid(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  readTimeMinutes: z.number().int().min(1).optional(),
  sortOrder: z.number().int().default(0),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid data', issues: parsed.error.errors }, { status: 400 });

    const { title, slug, ...rest } = parsed.data;
    const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const article = await prisma.knowledgeBaseArticle.create({
      data: { title, slug: generatedSlug, ...rest, status: rest.status as any, authorId: session!.user.id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json({ success: true, data: article }, { status: 201 });
  } catch (err) {
    logger.error('POST admin KB articles failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to create article' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
