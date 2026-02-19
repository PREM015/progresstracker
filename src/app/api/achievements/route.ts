import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiResponse } from '@/lib/apiResponse';
import { z } from 'zod';
import { AchievementCategory } from '@/types/achievement';

// Validation schema for query params
const querySchema = z.object({
  unlocked: z.enum(['true', 'false']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return apiResponse.unauthorized('Unauthorized', requestId);
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const query = querySchema.safeParse({
      unlocked: searchParams.get('unlocked') || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    });

    if (!query.success) {
      return apiResponse.validationError('Invalid query parameters', query.error.errors, requestId);
    }

    const { unlocked, category, search, limit, offset } = query.data;

    // Base filter
    const where: any = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Unlocked filter
    if (unlocked === 'true') {
      where.users = {
        some: {
          userId,
        },
      };
    } else if (unlocked === 'false') {
      where.users = {
        none: {
          userId,
        },
      };
    }

    // Fetch achievements
    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        include: {
          users: {
            where: { userId },
            select: {
              id: true,
              unlockedAt: true,
              isPinned: true,
              progress: true,
              progressPercentage: true,
              currentThreshold: true,
              notified: true,
              isHidden: true,
              createdAt: true,
            }
          }
        },
        orderBy: { points: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.achievement.count({ where }),
    ]);

    // Transform response to match UserAchievement[] expected by frontend context
    const formattedAchievements = achievements.map(ach => {
      const userAch = ach.users[0];

      return {
        id: userAch?.id || `temp-${ach.id}`, // Temporary ID for locked items
        userId: userId,
        achievementId: ach.id,
        achievement: {
          ...ach,
          users: undefined, // Exclude the raw relation from the nested achievement object
        },
        progress: userAch?.progress || 0,
        progressPercentage: userAch?.progressPercentage || 0,
        currentThreshold: userAch?.currentThreshold || 0,
        unlockedAt: userAch?.unlockedAt || null,
        notified: userAch?.notified || false,
        isPinned: userAch?.isPinned || false,
        isHidden: userAch?.isHidden || ach.isHidden,
        createdAt: userAch?.createdAt || new Date(),

        // Custom fields for frontend convenience
        isUnlocked: !!userAch,
      };
    });

    return apiResponse.success(
      {
        achievements: formattedAchievements,
        pagination: {
          total,
          limit: limit || total,
          offset,
          count: formattedAchievements.length
        }
      },
      { meta: { requestId } }
    );

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return apiResponse.error(error, requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}