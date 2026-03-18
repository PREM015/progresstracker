import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ period: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }
    
    // Period validation
    const period = (await params).period;
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
        return apiResponse.error('Invalid period', requestId);
    }

    // Historical rank tracking is not yet supported in the schema
    const history: any[] = [];

    return apiResponse.success(history, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
