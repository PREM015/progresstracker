import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

// TODO: Implement this route


export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const userId = (await params).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId, isPublic: true },
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

    if (!user) {
      return apiResponse.notFound('User', requestId);
    }

    return apiResponse.success(user, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
