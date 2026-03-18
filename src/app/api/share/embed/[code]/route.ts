import { NextRequest, NextResponse } from "next/server";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

// TODO: Implement this route


export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const code = (await params).code;
    
    // Mock embed logic
    const embedCode = `<iframe src="${process.env.NEXT_PUBLIC_APP_URL}/embed/${code}" width="100%" height="400" frameborder="0"></iframe>`;
    
    return apiResponse.success({ embedCode, code }, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
