// src/app/api/knowledge-base/search/route.ts
// GET: search knowledge base articles

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('categoryId') || undefined;
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));

    if (!query.trim()) {
      return NextResponse.json({ success: false, error: 'Search query is required' }, { status: 400 });
    }

    const where: any = {
      status: 'PUBLISHED',
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { excerpt: { contains: query, mode: 'insensitive' } },
        { tags: { has: query.toLowerCase() } },
      ],
    };

    if (categoryId) where.categoryId = categoryId;

    const [articles, total] = await Promise.all([
      prisma.knowledgeBaseArticle.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          viewCount: true,
          helpfulYes: true,
          helpfulNo: true,
          tags: true,
          category: { select: { id: true, name: true, slug: true, icon: true } },
        },
      }),
      prisma.knowledgeBaseArticle.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { articles, total, page, limit, totalPages: Math.ceil(total / limit), query },
    });
  } catch (error) {
    logger.error('GET /api/knowledge-base/search failed', {}, error);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
