
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, unauthorized } from "@/lib/apiResponse";
import { getSession } from "@/middleware/auth";
import prisma from "@/lib/prisma";
import { PlatformCategory } from "@prisma/client";

// Helper to parse integer with default
const parseIntParam = (val: string | null, def: number): number => {
    if (!val) return def;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? def : parsed;
};

export const GET = withErrorHandling(async (req: NextRequest) => { // Updated
    // 1. Auth check
    const session = await getSession(req);
    if (!session) {
        return unauthorized();
    }
    const userId = (session as any).id || (session as any).sub;

    // 2. Parse query params
    const { searchParams } = new URL(req.url);
    const page = parseIntParam(searchParams.get("page"), 1);
    const limit = Math.min(parseIntParam(searchParams.get("limit"), 20), 100);
    const skip = (page - 1) * limit;

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const platformId = searchParams.get("platformId");
    const category = searchParams.get("category") as PlatformCategory | null;
    const source = searchParams.get("source");

    // 3. Build Prisma where clause
    const where: any = {
        userId,
        deletedAt: null,
    };

    if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (platformId) where.platformId = platformId;
    if (category) where.category = category;
    if (source) where.source = source;

    // 4. Execute queries in parallel
    const [total, entries] = await Promise.all([
        prisma.trackerEntry.count({ where }),
        prisma.trackerEntry.findMany({
            where,
            take: limit,
            skip,
            orderBy: [
                { date: "desc" },
                { createdAt: "desc" },
            ],
            include: {
                platform: {
                    select: {
                        name: true,
                        icon: true,
                    },
                },
                customPlatform: {
                    select: {
                        name: true,
                        icon: true,
                    },
                },
            },
        }),
    ]);

    // 5. Transform response
    const activities = entries.map((entry) => ({
        id: entry.id,
        date: entry.date.toISOString(),
        category: entry.category,
        platformName: entry.platform?.name || entry.customPlatform?.name || "Unknown",
        platformIcon: entry.platform?.icon || entry.customPlatform?.icon || null,
        problemsSolved: entry.problemsSolved,
        commits: entry.commits,
        pullRequests: entry.pullRequests,
        timeSpent: entry.timeSpent,
        notes: entry.notes,
        tags: entry.tags,
        mood: entry.mood,
        source: entry.source,
        isVerified: entry.isVerified,
        createdAt: entry.createdAt.toISOString(),
    }));

    // 6. Return success response
    return success({
        activities,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
        },
    });
});
