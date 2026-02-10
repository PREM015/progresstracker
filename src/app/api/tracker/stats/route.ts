import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * API Route: /api/tracker/stats
 * 
 * @description TODO: Add description
 * @created 2026-01-26
 */

// GET - Fetch data
export async function GET(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, thisWeek, today] = await Promise.all([
      prisma.trackerEntry.count({ where: { userId } }),
      prisma.trackerEntry.count({
        where: {
          userId,
          date: { gte: startOfWeek }
        }
      }),
      prisma.trackerEntry.count({
        where: {
          userId,
          date: { gte: startOfDay }
        }
      }),
    ]);

    return NextResponse.json({
      total,
      thisWeek,
      today,
    });
  } catch (error) {
    console.error('[TRACKER_STATS_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // TODO: Validate body
    // TODO: Implement POST logic

    return NextResponse.json({
      success: true,
      data: {},
    }, { status: 201 });
  } catch (error) {
    console.error('[TRACKER_STATS_POST]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



