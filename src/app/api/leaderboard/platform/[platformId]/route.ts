import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ platformId: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const platformId = (await params).platformId;
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const users = await prisma.user.findMany({
      where: { 
        isPublic: true, 
        isActive: true,
        platforms: { some: { platformId } }
      },
      orderBy: { totalPoints: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
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

    const total = await prisma.user.count({ 
      where: { 
        isPublic: true, 
        isActive: true,
        platforms: { some: { platformId } }
      } 
    });

    return apiResponse.paginated(
      users,
      { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 },
      { meta: { requestId } }
    );
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
