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

    // Mock global search results
    const results = {
        query,
        count: 2,
        items: [
            { id: '1', type: 'activity', name: 'Morning Exercise', relevance: 0.98 },
            { id: '2', type: 'goal', name: 'Daily Coding', relevance: 0.85 }
        ]
    };

    return apiResponse.success(results, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
