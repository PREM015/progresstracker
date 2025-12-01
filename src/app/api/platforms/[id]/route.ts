import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PlatformService } from "@/services/platformService"

/**
 * GET /api/platforms/[id]
 * Get single platform details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const platform = await PlatformService.getPlatformById(params.id)

    if (!platform) {
      return NextResponse.json(
        { error: "Platform not found" },
        { status: 404 }
      )
    }

    // Check if user has connected this platform
    const isConnected = await PlatformService.isPlatformConnected(
      session.user.id,
      params.id
    )

    return NextResponse.json({
      platform,
      isConnected,
    })
  } catch (error: any) {
    console.error("Error fetching platform:", error)
    return NextResponse.json(
      { error: "Failed to fetch platform", message: error.message },
      { status: 500 }
    )
  }
}