import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const totalGenerated = await prisma.exportJob.count({
      where: { userId: session.user.id }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const generatedLast30Days = await prisma.exportJob.count({
      where: { 
        userId: session.user.id,
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    const stats = {
      totalGenerated,
      generatedLast30Days,
      limitPerMonth: 50,
      remainingThisMonth: Math.max(0, 50 - generatedLast30Days)
    };

    return apiResponse.success(stats, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
