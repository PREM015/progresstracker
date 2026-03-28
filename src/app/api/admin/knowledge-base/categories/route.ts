// src/app/api/admin/knowledge-base/categories/route.ts
// GET/POST categories

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

export async function GET(): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const categories = await prisma.knowledgeBaseCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { articles: true } } },
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (err) {
    logger.error('GET admin KB categories failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid data', issues: parsed.error.errors }, { status: 400 });

    const { name, slug, ...rest } = parsed.data;
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const category = await prisma.knowledgeBaseCategory.create({
      data: { name, slug: generatedSlug, ...rest },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (err) {
    logger.error('POST admin KB categories failed', {}, err);
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
