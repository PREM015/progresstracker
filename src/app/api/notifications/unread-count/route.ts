// src/app/api/notifications/unread-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/redis";

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for current user.
 * Uses Redis cache (60s TTL) to avoid hammering DB on every poll.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { count: 0, success: true },
        { status: 200 }
      );
    }

    const userId = (session.user as { id?: string }).id;
    const cacheKey = userId ? `unread:${userId}` : `unread:${session.user.email}`;

    // Cache-first
    const cached = await cache.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return NextResponse.json({ success: true, count: cached });
    }

    // DB query
    const count = await prisma.notification.count({
      where: {
        user: { email: session.user.email },
        isRead: false,
      },
    });

    // Cache for 60 seconds
    await cache.set(cacheKey, count, 60);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("[Notifications API] Error fetching unread count:", error);
    return NextResponse.json(
      {
        success: false,
        count: 0,
        message: "Failed to fetch unread notifications",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
