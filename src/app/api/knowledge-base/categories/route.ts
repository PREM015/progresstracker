// src/app/api/knowledge-base/categories/route.ts
// GET: list all categories

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const categories = await prisma.knowledgeBaseCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { articles: { where: { status: 'PUBLISHED' as any } } } },
      },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    logger.error('GET /api/knowledge-base/categories failed', {}, error);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
