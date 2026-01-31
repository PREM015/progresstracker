/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/platforms/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PlatformService } from "@/services/platformService";
import { logger } from "@/lib/logger";
import { PlatformCategory } from "@prisma/client";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: "GET /api/platforms" });

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      log.warn("Unauthorized access attempt");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    log.debug("Fetching platforms", {
      userId: session.user.id,
      category,
      search,
      activeOnly,
    });

    let platforms: any;

    if (search) {
      platforms = await PlatformService.searchPlatforms(search);
      log.info("Search completed", { 
        search, 
        resultCount: platforms.length,
        duration: Date.now() - startTime,
      });
    } else if (category) {
      if (!Object.values(PlatformCategory).includes(category as PlatformCategory)) {
        log.warn("Invalid category requested", { category });
        return NextResponse.json(
          { success: false, error: "Invalid category" },
          { status: 400 }
        );
      }
      platforms = await PlatformService.getPlatformsByCategory(category as PlatformCategory);
      log.info("Category filter applied", {
        category,
        resultCount: platforms.length,
        duration: Date.now() - startTime,
      });
    } else {
      platforms = await PlatformService.getAllPlatforms();
      // Normalize platforms array
      const platformList = Array.isArray(platforms) ? platforms : platforms.data;
      log.info("All platforms fetched", {
        resultCount: platformList.length,
        duration: Date.now() - startTime,
      });
      return NextResponse.json({
        success: true,
        platforms,
        count: platformList.length,
      });
    }

    // For search or category (already arrays)
    return NextResponse.json({
      success: true,
      platforms,
      count: Array.isArray(platforms) ? platforms.length : platforms.data?.length ?? 0,
    });
  } catch (error) {
    log.error(
      "Failed to fetch platforms",
      { duration: Date.now() - startTime },
      error
    );
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch platforms",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
