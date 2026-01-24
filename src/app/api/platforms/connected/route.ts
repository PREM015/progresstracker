import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { PlatformService } from "@/services/platformService"

/**
 * GET /api/platforms/connected
 * Get user's connected platforms
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const connections = await PlatformService.getUserConnectedPlatforms(
      session.user.id
    )

    const stats = await PlatformService.getConnectionStats(session.user.id)

    return NextResponse.json({
      connections,
      stats,
    })
  } catch (error: any) {
    logger.error("Error fetching connected platforms:", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Failed to fetch connected platforms", message: error.message },
      { status: 500 }
    )
  }
}