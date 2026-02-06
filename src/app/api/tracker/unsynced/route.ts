import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/tracker/unsynced - Get entries not yet synced/verified
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const source = searchParams.get("source"); // manual, import

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
      isVerified: false,
    };

    if (source) {
      whereClause.source = source;
    } else {
      whereClause.source = { in: ["manual", "import"] };
    }

    const [entries, total] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: whereClause,
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
            },
          },
          customPlatform: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.trackerEntry.count({ where: whereClause }),
    ]);

    // Group by source
    const bySource = await prisma.trackerEntry.groupBy({
      by: ["source"],
      where: {
        userId: session.user.id,
        isVerified: false,
      },
      _count: {
        id: true,
      },
    });

    return apiResponse({
      entries,
      bySource,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + entries.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching unsynced entries:", error);
    return apiError("Failed to fetch unsynced entries", 500);
  }
}
