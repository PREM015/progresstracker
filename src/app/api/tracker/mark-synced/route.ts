import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// POST /api/tracker/mark-synced - Mark entries as synced/verified
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { entryIds, markAll } = body;

    if (!entryIds && !markAll) {
      return apiError("entryIds array or markAll flag is required", 400);
    }

    let updateResult;

    if (markAll) {
      // Mark all unsynced entries as verified
      updateResult = await prisma.trackerEntry.updateMany({
        where: {
          userId: session.user.id,
          isVerified: false,
          source: { in: ["manual", "import"] },
        },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
    } else {
      // Verify that all entries belong to user
      const entries = await prisma.trackerEntry.findMany({
        where: {
          id: { in: entryIds },
          userId: session.user.id,
        },
        select: { id: true },
      });

      const validIds = entries.map((e) => e.id);

      if (validIds.length !== entryIds.length) {
        return apiError("Some entries not found or unauthorized", 400);
      }

      updateResult = await prisma.trackerEntry.updateMany({
        where: {
          id: { in: validIds },
        },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
    }

    return apiResponse({
      success: true,
      updatedCount: updateResult.count,
    });
  } catch (error) {
    console.error("Error marking entries as synced:", error);
    return apiError("Failed to mark entries as synced", 500);
  }
}
