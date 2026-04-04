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

    const id = (await params).id;
    const exportJob = await prisma.exportJob.findUnique({
      where: { id, userId: session.user.id }
    });

    if (!exportJob) {
      return apiResponse.notFound('Export Job', requestId);
    }

    if (exportJob.status !== 'PENDING' && exportJob.status !== 'PROCESSING') {
        return apiResponse.error('Only pending or processing jobs can be canceled', requestId);
    }

    await prisma.exportJob.update({
        where: { id },
        data: { status: 'FAILED' as any, errorMessage: 'Canceled by user' }
    });

    return apiResponse.success({ message: 'Export canceled successfully' }, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
