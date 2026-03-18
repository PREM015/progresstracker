import { NextRequest, NextResponse } from "next/server";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

// TODO: Implement this route


export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const types = [
      { id: 'activity', name: 'Activity Summary', description: 'Summary of all tracked activities' },
      { id: 'progress', name: 'Progress Report', description: 'Detailed progress against goals' },
      { id: 'streak', name: 'Streak Analysis', description: 'In-depth look at your streaks' }
    ];

    return apiResponse.success(types, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
