// src/app/api/admin/knowledge-base/stats/route.ts
// GET: KB stats

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!session.user.isAdmin && session.user.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const [totalArticles, publishedArticles, draftArticles, totalCategories, totalViews, topArticles] = await Promise.all([
      prisma.knowledgeBaseArticle.count(),
      prisma.knowledgeBaseArticle.count({ where: { status: 'PUBLISHED' as any } }),
      prisma.knowledgeBaseArticle.count({ where: { status: 'DRAFT' as any } }),
      prisma.knowledgeBaseCategory.count(),
      prisma.knowledgeBaseArticle.aggregate({ _sum: { viewCount: true } }),
      prisma.knowledgeBaseArticle.findMany({
        where: { status: 'PUBLISHED' as any },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, viewCount: true, helpfulYes: true, helpfulNo: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalArticles,
        publishedArticles,
        draftArticles,
        totalCategories,
        totalViews: totalViews._sum.viewCount ?? 0,
        topArticles,
      },
    });
  } catch (error) {
    logger.error('GET /api/admin/knowledge-base/stats failed', {}, error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
