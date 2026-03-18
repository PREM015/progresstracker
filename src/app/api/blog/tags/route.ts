import { NextRequest, NextResponse } from "next/server";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";
import blogService from "@/services/blogService";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const tags = await blogService.getTags();
    return apiResponse.success(tags, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
