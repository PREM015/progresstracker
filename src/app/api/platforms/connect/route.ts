import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { PlatformService } from "@/services/platformService"
import { z } from "zod"

const connectSchema = z.object({
  platformId: z.string(),
  username: z.string().optional(),
  token: z.string().optional(),
})

/**
 * POST /api/platforms/connect
 * Connect a platform to user account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { platformId, username, token } = connectSchema.parse(body)

    // ConnectPlatformInput expects userId (required)
    const input = {
      userId: session.user.id,
      platformId,
      username,
      token,
    }

    const connection = await PlatformService.connectPlatform(
      session.user.id,
      platformId,
      username,
      token,
      input
    )

    return NextResponse.json({
      message: "Platform connected successfully",
      connection,
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Error connecting platform:", err)

    if (err.message === "Platform already connected") {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Failed to connect platform", message: err.message },
      { status: 500 }
    )
  }
}
