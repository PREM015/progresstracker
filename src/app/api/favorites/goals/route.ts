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

    const goals = await prisma.bookmark.findMany({
      where: { 
        userId: session.user.id,
        entityType: 'GOAL'
      },
      orderBy: { createdAt: 'desc' }
    });

    return apiResponse.success(goals, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const { goalId, title } = await request.json();
    if (!goalId) {
      return apiResponse.validationError('Goal ID is required');
    }

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_entityType_entityId: {
          userId: session.user.id,
          entityType: 'GOAL',
          entityId: goalId
        }
      },
      create: {
        userId: session.user.id,
        entityType: 'GOAL',
        entityId: goalId,
        title: title || 'Favorite Goal'
      },
      update: {
        title: title || 'Favorite Goal'
      }
    });

    return apiResponse.success(bookmark, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return apiResponse.unauthorized('Authentication required', requestId);
      }
  
      const { goalId } = await request.json();
      if (!goalId) {
        return apiResponse.validationError('Goal ID is required');
      }
  
      await prisma.bookmark.delete({
        where: {
          userId_entityType_entityId: {
            userId: session.user.id,
            entityType: 'GOAL',
            entityId: goalId
          }
        }
      });
  
      return apiResponse.success({ message: 'Goal removed from favorites' }, { meta: { requestId } });
    } catch (error) {
      return apiResponse.internalError('Operation failed', requestId);
    }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
