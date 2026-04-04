import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // Get query parameters
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Fetch recent reports for user
    const reports = await prisma.report.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('Recent reports fetched', { userId: session.user.id, count: reports.length });
    return apiResponse.success({ reports }, { meta: { requestId } });
  } catch (error) {
    logger.error('Failed to fetch recent reports', { requestId }, error);
    return apiResponse.internalError('Failed to fetch reports', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
