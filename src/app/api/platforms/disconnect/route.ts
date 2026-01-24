import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { PlatformService } from "@/services/platformService"
import { z } from "zod"

const disconnectSchema = z.object({
  platformId: z.string(),
})

/**
 * POST /api/platforms/disconnect
 * Disconnect a platform from user account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { platformId } = disconnectSchema.parse(body)

    await PlatformService.disconnectPlatform(session.user.id, platformId)

    return NextResponse.json({
      message: "Platform disconnected successfully",
    })
  } catch (error: any) {
    logger.error("Error disconnecting platform:", error instanceof Error ? error : new Error(String(error)))
    
    if (error.message === "Platform not connected") {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to disconnect platform", message: error.message },
      { status: 500 }
    )
  }
}