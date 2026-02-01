import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';
import type { ApiErrorResponse } from '@/lib/apiResponse';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type {  } from '@prisma/client';
import { GoalStatus } from '@prisma/client';

const goalsAnalyticsSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'FAILED', 'ALL']).optional().default('ALL'),
  includeProgress: z.boolean().optional().default(true),
  includeStats: z.boolean().optional().default(true),
});

type GoalAnalyticsParams = z.infer<typeof goalsAnalyticsSchema>;

export const GET = async (req: NextRequest) => {
  const startTime = Date.now();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiResponse.success({
      goals: [],
      stats: undefined,
      progressBreakdown: undefined,
    });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');
  const includeProgressParam = searchParams.get('includeProgress');
  const includeStatsParam = searchParams.get('includeStats');

  const validationResult = goalsAnalyticsSchema.safeParse({
    status: statusParam ?? undefined,
    includeProgress: includeProgressParam !== 'false',
    includeStats: includeStatsParam !== 'false',
  });

  if (!validationResult.success) {
    return apiResponse.success({
      goals: [],
      stats: undefined,
      progressBreakdown: undefined,
    });
  }

  const params: GoalAnalyticsParams = validationResult.data;

  const where: { userId: string; status?: GoalStatus } = { userId };
  if (params.status !== 'ALL') where.status = params.status as GoalStatus;

  // ---------------- Fetch goals ----------------
  const goals = await prisma.goal.findMany({
    where,
    // milestones: remove if not exist in schema
    orderBy: { createdAt: 'desc' },
  });

  // ---------------- Stats ----------------
  const stats = {
    total: goals.length,
    byStatus: {
      active: goals.filter((g) => g.status === 'ACTIVE').length,
      completed: goals.filter((g) => g.status === 'COMPLETED').length,
      paused: goals.filter((g) => g.status === 'PAUSED').length,
      failed: goals.filter((g) => g.status === 'FAILED').length,
    },
    avgProgress:
      goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0,
    completionRate:
      goals.length > 0
        ? Math.round((goals.filter((g) => g.status === 'COMPLETED').length / goals.length) * 100)
        : 0,
    onTrack: goals.filter((g) => g.status === 'ACTIVE' && g.progress >= 50).length,
    atRisk: goals.filter((g) => {
      if (g.status !== 'ACTIVE' || !g.deadline) return false;
      const daysLeft = Math.ceil((g.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7 && g.progress < 80;
    }).length,
  };

  const progressBreakdown = {
    notStarted: goals.filter((g) => g.progress === 0).length,
    inProgress: goals.filter((g) => g.progress > 0 && g.progress < 100).length,
    completed: goals.filter((g) => g.progress === 100).length,
  };

  // ---------------- Response ----------------
  const response = {
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description ?? null,
      status: g.status,
      progress: g.progress,
      target: g.target ?? null,
      progressPercentage: g.progress,
      category: g.category,
      deadline: g.deadline?.toISOString() ?? null,
      completedAt: g.completedAt?.toISOString() ?? null,
      // remove milestones if schema doesn't have it
    })),
    stats: params.includeStats ? stats : undefined,
    progressBreakdown: params.includeStats ? progressBreakdown : undefined,
  };

  const duration = Date.now() - startTime;

  return apiResponse.success(response, {
    meta: { status: params.status, executionTime: duration },
  });
};

// ---------------- Unauthorized helper ----------------
export function unauthorized(
  message = 'Unauthorized',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: { message, code: 'UNAUTHORIZED' },
    meta: { requestId, timestamp: new Date().toISOString() },
  };
  return NextResponse.json(response, { status: 401 });
}
/** * Create forbidden error response
 */
export function forbidden(    
  message = 'Forbidden',    
  requestId?: string  
): NextResponse<ApiErrorResponse> { 
  const response: ApiErrorResponse = {
    success: false,
    error: { message, code: 'FORBIDDEN' },
    meta: { requestId, timestamp: new Date().toISOString() },
  };  
  return NextResponse.json(response, { status: 403 }); 
}
// -----------------------------------------------------
 
// ---------------- Error handler wrapper ----------------
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>  
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('Internal server error:', error);
      const response: ApiErrorResponse = {  
        success: false,
        error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
        meta: { timestamp: new Date().toISOString() },
      };
      return NextResponse.json(response, { status: 500 });
    } 
  };
}
// -----------------------------------------------------  

 
 
