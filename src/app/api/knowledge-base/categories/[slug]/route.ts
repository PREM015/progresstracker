// src/app/api/knowledge-base/categories/[slug]/route.ts
// GET: category with articles

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Props): Promise<NextResponse> {
  try {
    const { slug } = await params;

    const category = await prisma.knowledgeBaseCategory.findFirst({
      where: { slug, isActive: true },
      include: {
        articles: {
          where: { status: 'PUBLISHED' as any },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            viewCount: true,
            helpfulYes: true,
            helpfulNo: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    logger.error('GET /api/knowledge-base/categories/[slug] failed', {}, error);
    return NextResponse.json({ success: false, error: 'Failed to fetch category' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
