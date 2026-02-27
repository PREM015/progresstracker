
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, unauthorized } from "@/lib/apiResponse";
import { getSession } from "@/middleware/auth";
import prisma from "@/lib/prisma";

export const GET = withErrorHandling(async (req: NextRequest) => { // Updated
    // 1. Auth check
    const session = await getSession(req);
    if (!session) {
        return unauthorized();
    }
    const userId = (session as any).id || (session as any).sub;

    // 2. Parse params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const typesParam = searchParams.get("types");
    const types = typesParam ? typesParam.split(",") : ["tracker", "achievement", "goal", "streak"];

    const dateFromStr = searchParams.get("dateFrom");
    const dateToStr = searchParams.get("dateTo");

    // 3. fetch data sources
    const queries = [];

    // Tracker Entries
    if (types.includes("tracker")) {
        const where: any = { userId, deletedAt: null };
        if (dateFromStr) where.date = { gte: new Date(dateFromStr) };
        if (dateToStr) {
            where.date = { ...where.date, lte: new Date(dateToStr) };
        }

        queries.push(
            prisma.trackerEntry.findMany({
                where,
                take: 50, // Fetch a bit more to allow for inter-mixing
                orderBy: { date: "desc" },
                include: { platform: true, customPlatform: true },
            }).then(res => res.map(item => ({
                type: "tracker_entry",
                id: item.id,
                data: {
                    ...item,
                    platformName: item.platform?.name || item.customPlatform?.name
                },
                timestamp: item.date.getTime(),
            })))
        );
    }

    // Achievements
    if (types.includes("achievement")) {
        const where: any = { userId };
        if (dateFromStr) where.unlockedAt = { gte: new Date(dateFromStr) };
        queries.push(
            prisma.userAchievement.findMany({
                where,
                take: 20,
                orderBy: { unlockedAt: "desc" },
                include: { achievement: true },
            }).then(res => res.map(item => ({
                type: "achievement_unlocked",
                id: item.id,
                data: item.achievement,
                timestamp: item.unlockedAt.getTime(),
            })))
        );
    }

    // Goals
    if (types.includes("goal")) {
        const where: any = { userId };
        if (dateFromStr) where.updatedAt = { gte: new Date(dateFromStr) };
        queries.push(
            prisma.goal.findMany({
                where,
                take: 20,
                orderBy: { updatedAt: "desc" },
            }).then(res => res.map(item => ({
                type: "goal_update",
                id: item.id,
                data: item,
                timestamp: item.updatedAt.getTime(),
            })))
        );
    }

    // Streak - Assuming StreakHistory or similar
    if (types.includes("streak") && (prisma as any).streakHistory) {
        // guard in case model doesn't exist yet as per schema check
        // prisma.streakHistory might not exist, checking notes. Notes say "streak: StreakHistory where userId"
        // I'll try to use it if it exists, otherwise skip to avoid crash if schema not updated.
        // Actually I should trust the notes.
        queries.push(
            (prisma as any).streakHistory.findMany({
                where: { userId },
                take: 20,
                orderBy: { date: "desc" }
            }).then((res: any[]) => res.map(item => ({
                type: "streak_milestone",
                id: item.id,
                data: item,
                timestamp: item.date instanceof Date ? item.date.getTime() : new Date(item.date).getTime()
            })))
        )
    }

    const results = await Promise.all(queries);
    const flatFeed = results.flat();

    // 5. Merge and Sort
    flatFeed.sort((a, b) => b.timestamp - a.timestamp);

    // 6. Pagination
    const total = flatFeed.length;
    const startIndex = (page - 1) * limit;
    const slicedFeed = flatFeed.slice(startIndex, startIndex + limit);

    return success({
        feed: slicedFeed,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: startIndex + limit < total
        }
    });
});
