// src/app/api/search/users/route.ts
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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiResponse.unauthorized('Authentication required');

    const params = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({ q: params.get('q') || '', page: params.get('page'), limit: params.get('limit') });

    if (!parsed.success) return apiResponse.validationError('Invalid parameters', parsed.error.errors);

    const { q, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      isPublic: true,
      id: { not: session.user.id }, // exclude self
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, username: true, name: true, image: true, bio: true,
          totalPoints: true, currentStreak: true, totalProblems: true,
          rank: true, isVerified: true,
        },
        orderBy: { totalPoints: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    logger.info('Users search', { userId: session.user.id, q, total });

    return apiResponse.paginated(users, { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1 });
  } catch (error) {
    logger.error('Users search failed', {}, error);
    return apiResponse.internalError('Search failed');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
