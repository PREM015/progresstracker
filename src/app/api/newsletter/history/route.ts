import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";

// Get newsletter subscription history

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get newsletter events for user
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const page = parseInt(searchParams.get('page') || '1');

    const [events, total] = await Promise.all([
      (prisma as any).newsletterEvent.findMany({
        where: { userId: session.user.id } as any,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }).catch(() => []),
      (prisma as any).newsletterEvent.count({
        where: { userId: session.user.id } as any,
      }).catch(() => 0),
    ]);

    logger.info('Newsletter history fetched', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: events,
      pagination: { page, limit, total },
    });
  } catch (error) {
    logger.error('Newsletter history failed', {}, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
