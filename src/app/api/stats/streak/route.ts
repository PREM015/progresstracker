import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; // Keep for consistency if needed, though StatsService handles data
import { logger } from "@/lib/logger";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import apiResponse from "@/lib/apiResponse";
import { StatsService } from "@/services/statsService";

const RATE_LIMIT = 30;

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return apiResponse.unauthorized("Authentication required", requestId);
        }

        const userId = session.user.id;
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:streak:${userId}`);

        if (!rateLimitResult.success) {
            return apiResponse.rateLimited(60, requestId);
        }

        const streakData = await StatsService.calculateStreak(userId);

        return apiResponse.success(streakData, { meta: { requestId } });
    } catch (error) {
        logger.error("GET /api/stats/streak failed", { requestId }, error);
        return apiResponse.internalError("Failed to fetch streak data", requestId);
    }
}
