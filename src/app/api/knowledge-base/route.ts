// src/app/api/knowledge-base/route.ts
// GET: list categories + featured articles

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const [categories, featuredArticles] = await Promise.all([
      prisma.knowledgeBaseCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { articles: { where: { status: 'PUBLISHED' as any } } } },
        },
      }),
      prisma.knowledgeBaseArticle.findMany({
        where: { status: 'PUBLISHED' as any, isFeatured: true },
        orderBy: { viewCount: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          viewCount: true,
          helpfulYes: true,
          helpfulNo: true,
          category: { select: { id: true, name: true, slug: true, icon: true } },
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: { categories, featuredArticles } });
  } catch (error) {
    logger.error('GET /api/knowledge-base failed', {}, error);
    return NextResponse.json({ success: false, error: 'Failed to fetch knowledge base' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
