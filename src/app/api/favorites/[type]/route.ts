import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function GET(
    request: NextRequest, 
    { params }: { params: Promise<{ type: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const type = (await params).type.toUpperCase();

    const bookmarks = await prisma.bookmark.findMany({
      where: { 
        userId: session.user.id,
        entityType: type
      },
      orderBy: { createdAt: 'desc' }
    });

    return apiResponse.success(bookmarks, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
