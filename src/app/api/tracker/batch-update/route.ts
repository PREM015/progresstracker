import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// POST /api/tracker/batch-update - Update multiple entries at once
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { entryIds, updates, filters } = body;

    if (!updates || typeof updates !== "object") {
      return apiError("updates object is required", 400);
    }

    if (!entryIds && !filters) {
      return apiError("entryIds array or filters object is required", 400);
    }

    // Remove fields that shouldn't be batch updated
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.userId;
    delete safeUpdates.createdAt;

    let updateResult;

    if (entryIds && Array.isArray(entryIds)) {
      // Verify that all entries belong to user
      const entries = await prisma.trackerEntry.findMany({
        where: {
          id: { in: entryIds },
          userId: session.user.id,
        },
        select: { id: true },
      });

      const validIds = entries.map((e) => e.id);

      if (validIds.length === 0) {
        return apiError("No valid entries found", 400);
      }

      updateResult = await prisma.trackerEntry.updateMany({
        where: {
          id: { in: validIds },
        },
        data: {
          ...safeUpdates,
          updatedAt: new Date(),
        },
      });
    } else if (filters) {
      // Update based on filters
      const whereClause: any = {
        userId: session.user.id,
      };

      if (filters.platformId) {
        whereClause.platformId = filters.platformId;
      }

      if (filters.category) {
        whereClause.category = filters.category;
      }

      if (filters.startDate && filters.endDate) {
        whereClause.date = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      if (filters.source) {
        whereClause.source = filters.source;
      }

      // Safety check: require at least one filter besides userId
      if (Object.keys(whereClause).length <= 1) {
        return apiError("At least one filter is required for batch update", 400);
      }

      updateResult = await prisma.trackerEntry.updateMany({
        where: whereClause,
        data: {
          ...safeUpdates,
          updatedAt: new Date(),
        },
      });
    }

    return apiResponse.success({
      success: true,
      updatedCount: updateResult?.count || 0,
    });
  } catch (error) {
    console.error("Error batch updating entries:", error);
    return apiError("Failed to update entries", 500);
  }
}
