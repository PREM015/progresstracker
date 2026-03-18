import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // Mock share list
    const shares = [
        { id: 'share-1', type: 'report', title: 'Monthly Progress', views: 12, createdAt: new Date().toISOString() },
        { id: 'share-2', type: 'dashboard', title: 'Public Dashboard', views: 45, createdAt: new Date().toISOString() }
    ];

    return apiResponse.success(shares, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
