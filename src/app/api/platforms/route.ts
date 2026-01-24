import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PlatformService } from "@/services/platformService"

/**
 * GET /api/platforms
 * Get all platforms with optional filters
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    let platforms

    if (search) {
      platforms = await PlatformService.searchPlatforms(search)
    } else if (category) {
      platforms = await PlatformService.getPlatformsByCategory(category as any)
    } else {
      platforms = await PlatformService.getAllPlatforms()
    }

    return NextResponse.json({ platforms })
  } catch (error: any) {
    logger.error("Error fetching platforms:", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Failed to fetch platforms", message: error.message },
      { status: 500 }
    )
  }
}