import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";
import crypto from "crypto";

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

    // Mock share creation logic
    const shareCode = crypto.randomBytes(8).toString('hex');
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareCode}`;

    return apiResponse.success({ shareCode, shareUrl }, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
