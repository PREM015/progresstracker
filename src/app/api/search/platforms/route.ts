// src/app/api/search/platforms/route.ts
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
  category: z.string().optional(),
  connected: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiResponse.unauthorized('Authentication required');

    const params = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      q: params.get('q') || '',
      category: params.get('category') || undefined,
      connected: params.get('connected') || undefined,
      page: params.get('page'),
      limit: params.get('limit'),
    });

    if (!parsed.success) {
      return apiResponse.validationError('Invalid parameters', parsed.error.errors);
    }

    const { q, category, connected, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // Get all platforms matching query
    const platforms = await prisma.platform.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
        ...(category && { category: { contains: category, mode: 'insensitive' } }),
      } as any,
      select: {
        id: true, name: true, slug: true, description: true,
        icon: true, category: true, isActive: true,
        _count: { select: { userPlatforms: true } as any },
      },
      orderBy: [{ name: 'asc' }],
      skip,
      take: limit,
    });

    // If filtering by connected, get user's connected platform IDs
    let connectedPlatformIds: Set<string> = new Set();
    if (connected !== undefined) {
      const userPlatforms = await prisma.userPlatform.findMany({
        where: { userId: session.user.id },
        select: { platformId: true },
      });
      connectedPlatformIds = new Set(userPlatforms.map((p: any) => p.platformId));
    }

    const enriched = platforms
      .map((p: any) => ({
        ...p,
        userCount: p._count.userPlatforms,
        isConnected: connectedPlatformIds.size > 0 ? connectedPlatformIds.has(p.id) : undefined,
        _count: undefined,
      }))
      .filter((p: any) => connected === undefined || p.isConnected === connected);

    const total = await prisma.platform.count({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
        ...(category && { category: { contains: category, mode: 'insensitive' } }),
      } as any,
    });

    logger.info('Platforms search', { userId: session.user.id, q, total });

    return apiResponse.paginated(enriched, { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1 });
  } catch (error) {
    logger.error('Platforms search failed', {}, error);
    return apiResponse.internalError('Search failed');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
