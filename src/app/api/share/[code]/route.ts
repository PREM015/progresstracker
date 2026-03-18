import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const code = (await params).code;

    // Schema doesn't have a Share model, mocked return
    const sharedData = {
        code,
        type: 'report',
        title: 'Shared Report',
        content: 'This is mocked shared content',
        createdAt: new Date().toISOString()
    };

    return apiResponse.success(sharedData, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
