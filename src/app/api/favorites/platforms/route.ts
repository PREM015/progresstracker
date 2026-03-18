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

    const platforms = await prisma.bookmark.findMany({
      where: { 
        userId: session.user.id,
        entityType: 'PLATFORM'
      },
      orderBy: { createdAt: 'desc' }
    });

    return apiResponse.success(platforms, { meta: { requestId } });
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

    const { platformId, title } = await request.json();
    if (!platformId) {
      return apiResponse.validationError('Platform ID is required');
    }

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_entityType_entityId: {
          userId: session.user.id,
          entityType: 'PLATFORM',
          entityId: platformId
        }
      },
      create: {
        userId: session.user.id,
        entityType: 'PLATFORM',
        entityId: platformId,
        title: title || 'Favorite Platform'
      },
      update: {
        title: title || 'Favorite Platform'
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
  
      const { platformId } = await request.json();
      if (!platformId) {
        return apiResponse.validationError('Platform ID is required');
      }
  
      await prisma.bookmark.delete({
        where: {
          userId_entityType_entityId: {
            userId: session.user.id,
            entityType: 'PLATFORM',
            entityId: platformId
          }
        }
      });
  
      return apiResponse.success({ message: 'Platform removed from favorites' }, { meta: { requestId } });
    } catch (error) {
      return apiResponse.internalError('Operation failed', requestId);
    }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
