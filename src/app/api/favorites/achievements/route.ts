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

    const achievements = await prisma.bookmark.findMany({
      where: { 
        userId: session.user.id,
        entityType: 'ACHIEVEMENT'
      },
      orderBy: { createdAt: 'desc' }
    });

    return apiResponse.success(achievements, { meta: { requestId } });
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

    const { achievementId, title } = await request.json();
    if (!achievementId) {
      return apiResponse.validationError('Achievement ID is required');
    }

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_entityType_entityId: {
          userId: session.user.id,
          entityType: 'ACHIEVEMENT',
          entityId: achievementId
        }
      },
      create: {
        userId: session.user.id,
        entityType: 'ACHIEVEMENT',
        entityId: achievementId,
        title: title || 'Favorite Achievement'
      },
      update: {
        title: title || 'Favorite Achievement'
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
  
      const { achievementId } = await request.json();
      if (!achievementId) {
        return apiResponse.validationError('Achievement ID is required');
      }
  
      await prisma.bookmark.delete({
        where: {
          userId_entityType_entityId: {
            userId: session.user.id,
            entityType: 'ACHIEVEMENT',
            entityId: achievementId
          }
        }
      });
  
      return apiResponse.success({ message: 'Achievement removed from favorites' }, { meta: { requestId } });
    } catch (error) {
      return apiResponse.internalError('Operation failed', requestId);
    }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
