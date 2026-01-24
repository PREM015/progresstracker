// src/app/api/platforms/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";import { logger } from '@/lib/logger';import { PlatformService } from "@/services/platformService";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/platforms/[id]
 * Get single platform details
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    // ✅ Required for Next.js 16
    const { id } = await context.params;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const platform = await PlatformService.getPlatformById(id);

    if (!platform) {
      return NextResponse.json(
        { error: "Platform not found" },
        { status: 404 }
      );
    }

    // ✅ Check if user has connected this platform
    const isConnected = await PlatformService.isPlatformConnected(
      session.user.id,
      id
    );

    return NextResponse.json({
      platform,
      isConnected,
    });
  } catch (error: any) {
    console.error("Error fetching platform:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch platform",
        message: error?.message,
      },
      { status: 500 }
    );
  }
}
