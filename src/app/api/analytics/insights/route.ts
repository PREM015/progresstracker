// src/app/api/analytics/insights/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';  // ❌ Remove withErrorHandler
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { InsightsService } from '@/services/analytics/insightsService';

const log = logger.child({ module: 'api.analytics.insights' });

// Validation schema
const insightsSchema = z.object({
  days: z.coerce.number().min(7).max(365).optional().default(30),
  categories: z.array(z.string()).optional(),
  includeRecommendations: z.boolean().optional().default(true),
});

/**
 * GET /api/analytics/insights
 * Get personalized insights and recommendations
 */
export async function GET(req: NextRequest): Promise<NextResponse> {  // ✅ Change this line
  const startTime = Date.now();

  try {  // ✅ Add try-catch
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized insights request');
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // Extract params first
    const days = searchParams.get('days');
    const categoriesParam = searchParams.get('categories');
    const includeRecommendations = searchParams.get('includeRecommendations');

    // Parse and validate query params
    const validationResult = insightsSchema.safeParse({
      days: days ?? undefined,
      categories: categoriesParam ? categoriesParam.split(',') : undefined,
      includeRecommendations: includeRecommendations !== 'false',
    });

    if (!validationResult.success) {
      log.warn('Invalid insights parameters', {
        userId,
        errors: validationResult.error.flatten(),
      });
      return apiResponse.validationError(
        'Invalid parameters',
        validationResult.error.issues
      );
    }

    const params = validationResult.data;

    log.info('Generating insights', {
      userId,
      days: params.days,
      categories: params.categories,
      includeRecommendations: params.includeRecommendations,
    });

    // Generate insights
    const insights = await InsightsService.generateInsights(userId, params.days);

    // Filter by categories if specified
    let filteredInsights = insights;
    if (params.categories && params.categories.length > 0) {
      filteredInsights = insights.filter((insight) =>
        params.categories!.includes(insight.category)
      );
    }

    // Get recommendations if requested
    const recommendations = params.includeRecommendations
      ? await InsightsService.getRecommendations(userId)
      : [];

    // Sort insights by priority
    const priorityOrder: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const sortedInsights = filteredInsights.sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );

    // Build response
    const response = {
      insights: sortedInsights,
      recommendations,
      summary: {
        total: sortedInsights.length,
        byType: sortedInsights.reduce<Record<string, number>>((acc, insight) => {
          acc[insight.type] = (acc[insight.type] || 0) + 1;
          return acc;
        }, {}),
        byPriority: sortedInsights.reduce<Record<string, number>>(
          (acc, insight) => {
            acc[insight.priority] = (acc[insight.priority] || 0) + 1;
            return acc;
          },
          {}
        ),
        byCategory: sortedInsights.reduce<Record<string, number>>(
          (acc, insight) => {
            acc[insight.category] = (acc[insight.category] || 0) + 1;
            return acc;
          },
          {}
        ),
      },
    };

    const duration = Date.now() - startTime;
    log.info('Insights generated successfully', {
      userId,
      insightsCount: sortedInsights.length,
      recommendationsCount: recommendations.length,
      duration,
    });

    return apiResponse.success(response, {
      meta: {
        days: params.days,
        executionTime: duration,
        generated: new Date().toISOString(),
      },
    });
  } catch (error) {  // ✅ Add catch block
    const duration = Date.now() - startTime;
    log.error('Error generating insights', { duration }, error);
    return apiResponse.error(error);
  }
}