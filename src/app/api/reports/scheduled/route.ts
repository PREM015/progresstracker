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

    // Returning empty array as schema lacks scheduledReport model
    return apiResponse.success([], { meta: { requestId } });
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
        return apiResponse.created({ message: 'Scheduled report created (mock)' }, { meta: { requestId } });
    } catch (error) {
        return apiResponse.internalError('Operation failed', requestId);
    }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
