// src/app/api/knowledge-base/articles/[slug]/helpful/route.ts
// POST: vote helpful yes/no

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const schema = z.object({ helpful: z.boolean() });

interface Props {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, { params }: Props): Promise<NextResponse> {
  try {
    const { slug } = await params;

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const article = await prisma.knowledgeBaseArticle.findFirst({
      where: { slug, status: 'PUBLISHED' as any },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    const updated = await prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data: parsed.data.helpful
        ? { helpfulYes: { increment: 1 } }
        : { helpfulNo: { increment: 1 } },
      select: { helpfulYes: true, helpfulNo: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('POST /api/knowledge-base/articles/[slug]/helpful failed', {}, error);
    return NextResponse.json({ success: false, error: 'Failed to record feedback' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
