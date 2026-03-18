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
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Mock autocomplete results
    const suggestions = [
        { text: 'Coding streak', type: 'search' },
        { text: 'Morning run', type: 'activity' }
    ].filter(s => s.text.toLowerCase().includes(query.toLowerCase()));

    return apiResponse.success(suggestions, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
