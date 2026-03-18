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

    // Mock preview data based on what a JSON export might look like
    const preview = {
        metadata: {
            user: session.user.id,
            generatedAt: new Date().toISOString()
        },
        dataSnippet: [
            { type: 'activity', date: '2023-11-01', value: 10 },
            { type: 'activity', date: '2023-11-02', value: 15 }
        ]
    };

    return apiResponse.success(preview, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
