// src/app/api/search/goals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const querySchema = z.object({
  q: z.string().min(1).max(200),
  status: z.enum(['ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiResponse.unauthorized('Authentication required');

    const params = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      q: params.get('q') || '',
      status: params.get('status') || undefined,
      page: params.get('page'),
      limit: params.get('limit'),
    });

    if (!parsed.success) {
      return apiResponse.validationError('Invalid parameters', parsed.error.errors);
    }

    const { q, status, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = {
      userId: session.user.id,
      ...(status && { status }),
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ],
    };

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        select: {
          id: true, title: true, description: true, status: true,
          progress: true, target: true, unit: true, deadline: true,
          category: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.goal.count({ where }),
    ]);

    logger.info('Goals search', { userId: session.user.id, q, total });

    return apiResponse.paginated(goals, { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1 });
  } catch (error) {
    logger.error('Goals search failed', {}, error);
    return apiResponse.internalError('Search failed');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
