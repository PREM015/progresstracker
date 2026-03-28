// src/app/api/knowledge-base/articles/[slug]/route.ts
// GET: single article

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Props): Promise<NextResponse> {
  try {
    const { slug } = await params;

    const article = await prisma.knowledgeBaseArticle.findFirst({
      where: { slug, status: 'PUBLISHED' as any },
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true } },
      },
    });

    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    // Increment view count (fire and forget)
    prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    // Related articles
    const related = await prisma.knowledgeBaseArticle.findMany({
      where: {
        categoryId: article.categoryId,
        id: { not: article.id },
        status: 'PUBLISHED' as any,
      },
      take: 4,
      select: { id: true, title: true, slug: true, excerpt: true, viewCount: true },
    });

    return NextResponse.json({ success: true, data: { ...article, related } });
  } catch (error) {
    logger.error('GET /api/knowledge-base/articles/[slug] failed', {}, error);
    return NextResponse.json({ success: false, error: 'Failed to fetch article' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
