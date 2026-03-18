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

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { rank: true, isPublic: true }
    });

    if (!currentUser || !currentUser.rank) {
      return apiResponse.error('Rank not established', requestId);
    }

    const radius = 5;
    const minRank = Math.max(1, currentUser.rank - radius);
    const maxRank = currentUser.rank + radius;

    const nearbyUsers = await prisma.user.findMany({
      where: {
        isPublic: true,
        isActive: true,
        rank: { gte: minRank, lte: maxRank }
      },
      orderBy: { rank: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        totalPoints: true,
        rank: true,
        currentStreak: true
      }
    });

    return apiResponse.success(nearbyUsers, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
