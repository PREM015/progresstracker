import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }
    const reportId = (await params).id;

    const report = await prisma.exportJob.findUnique({
      where: { id: reportId, userId: session.user.id }
    });

    if (!report) {
      return apiResponse.notFound('Report', requestId);
    }

    // Mock regenerating logic
    await prisma.exportJob.update({
        where: { id: reportId },
        data: { status: 'PENDING', hasError: false, errorMessage: null }
    });

    return apiResponse.success({ message: 'Regeneration started', reportId }, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
