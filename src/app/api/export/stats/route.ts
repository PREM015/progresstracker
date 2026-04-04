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

    const totalExports = await prisma.exportJob.count({
      where: { userId: session.user.id }
    });
    
    const successfulExports = await prisma.exportJob.count({
        where: { userId: session.user.id, status: 'COMPLETED' }
    });

    return apiResponse.success({ 
        totalExports, 
        successfulExports,
        failedExports: totalExports - successfulExports 
    }, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
