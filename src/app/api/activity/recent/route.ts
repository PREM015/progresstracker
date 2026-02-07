
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, unauthorized } from "@/lib/apiResponse";
import { getSession } from "@/middleware/auth";
import prisma from "@/lib/prisma";
import { timeAgo } from "@/lib/date";

export const GET = withErrorHandling(async (req: NextRequest) => {
    // 1. Auth check
    const session = await getSession(req);
    if (!session) {
        return unauthorized();
    }
    const userId = (session as any).id || (session as any).sub;

    // 2. Parse params
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 20);
    const platformId = searchParams.get("platformId");

    const where: any = {
        userId,
        deletedAt: null,
    };
    if (platformId) where.platformId = platformId;

    // 3. Fetch data
    const entries = await prisma.trackerEntry.findMany({
        where,
        take: limit,
        orderBy: [
            { date: "desc" },
            { createdAt: "desc" }
        ],
        include: {
            platform: {
                select: {
                    name: true,
                    icon: true
                }
            },
            customPlatform: {
                select: {
                    name: true,
                    icon: true
                }
            }
        }
    });

    // 4. Transform response
    const recentEntries = entries.map(entry => {
        const platformName = entry.platform?.name || entry.customPlatform?.name || "Unknown Platform";
        let summary = "Activity recorded";

        // Generate simple summary
        if (entry.problemsSolved && entry.problemsSolved > 0) {
            summary = `Solved ${entry.problemsSolved} problems on ${platformName}`;
        } else if (entry.commits && entry.commits > 0) {
            summary = `Made ${entry.commits} commits on ${platformName}`;
        } else if (entry.timeSpent && entry.timeSpent > 0) {
            summary = `Spent ${entry.timeSpent} mins on ${platformName}`;
        } else if (entry.notes) {
            summary = entry.notes.substring(0, 50) + (entry.notes.length > 50 ? "..." : "");
        }

        return {
            id: entry.id,
            date: entry.date.toISOString(),
            platformName,
            platformIcon: entry.platform?.icon || entry.customPlatform?.icon || null,
            category: entry.category,
            summary,
            timeAgo: timeAgo(entry.date)
        };
    });

    return success({
        entries: recentEntries
    });
});
