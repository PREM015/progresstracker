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

    const insights = [
      { id: '1', type: 'streak', title: 'Top 10%', description: 'Your current streak puts you in the top 10% of users.' },
      { id: '2', type: 'activity', title: 'Weekend Warrior', description: 'Most of your activity happens on weekends.' },
      { id: '3', type: 'platform', title: 'GitHub Focused', description: '75% of your tracked activity is on GitHub.' }
    ];

    return apiResponse.success(insights, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
