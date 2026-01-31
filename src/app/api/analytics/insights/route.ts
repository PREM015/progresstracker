/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/analytics/insights/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { InsightsService } from "@/services/analytics/insightsService";
import { z } from "zod";

// =============================================================================
// VALIDATION
// =============================================================================

const periodSchema = z.enum(["week", "month", "quarter", "year"]).default("week");

// =============================================================================
// TYPES (safe normalize)
// =============================================================================

type Period = "week" | "month" | "quarter" | "year";

type InsightsOptions = {
  includeRecommendations?: boolean;
  includeComparisons?: boolean;
};

type InsightResultObject = {
  highlights?: any[];
  recommendations?: any[];
  comparisons?: any[];
  [key: string]: any;
};

type InsightResult = any[] | InsightResultObject;

// =============================================================================
// GET - Generate insights for user
// =============================================================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn("Unauthorized insights access");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get("period") || "week";
    const period = periodSchema.parse(periodParam) as Period;

    const includeRecommendations =
      searchParams.get("recommendations") !== "false";
    const includeComparisons = searchParams.get("comparisons") !== "false";

    logger.debug("Generating insights", {
      userId: session.user.id,
      period,
      includeRecommendations,
      includeComparisons,
    });

    // Keep your original options object
    const options: InsightsOptions = {
      includeRecommendations,
      includeComparisons,
    };

    // -------------------------------------------------------------------------
    // Compatibility call:
    // Some versions of InsightsService.generateInsights accept 2 args
    // Some accept 3 args
    // We support both without breaking TS.
    // -------------------------------------------------------------------------
    const generator = InsightsService.generateInsights as unknown as (
      userId: string,
      period: Period,
      options?: InsightsOptions
    ) => Promise<InsightResult>;

    const rawInsights = await generator(session.user.id, period, options);

    // Normalize to always have `.highlights`
    const insights: InsightResultObject = Array.isArray(rawInsights)
      ? { highlights: rawInsights }
      : rawInsights || {};

    logger.info("Insights generated", {
      userId: session.user.id,
      period,
      insightCount: insights?.highlights?.length || 0,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: insights,
      meta: {
        period,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Invalid insights period", { errors: error.errors });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid period. Use: week, month, quarter, or year",
        },
        { status: 400 }
      );
    }

    logger.error("Insights API error", {}, error);
    return NextResponse.json(
      { success: false, error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
