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
    
    // Only admins can see global queue, else see own queue
    const isAdmin = session.user.role === 'admin';
    const whereClause: any = isAdmin ? { status: 'PENDING' } : { userId: session.user.id, status: 'PENDING' };

    const queue = await prisma.exportJob.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    return apiResponse.success(queue, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
