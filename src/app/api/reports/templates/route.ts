import { NextRequest, NextResponse } from "next/server";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const templates = [
      { id: 'standard', name: 'Standard Layout', isPremium: false },
      { id: 'executive', name: 'Executive Summary', isPremium: true },
      { id: 'detailed', name: 'Detailed Analysis', isPremium: true }
    ];

    return apiResponse.success(templates, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
