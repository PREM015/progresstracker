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
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const entries = await prisma.trackerEntry.findMany({
        where: {
            userId: session.user.id,
            OR: [
                { notes: { contains: query, mode: 'insensitive' } },
                { platform: { name: { contains: query, mode: 'insensitive' } } }
            ]
        },
        take: 20,
        include: { platform: true }
    });

    return apiResponse.success(entries, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
