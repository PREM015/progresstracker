import { NextRequest, NextResponse } from "next/server";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const formats = [
      { id: 'json', name: 'JSON Data', extension: '.json' },
      { id: 'csv', name: 'CSV Spreadhseet', extension: '.csv' },
      { id: 'pdf', name: 'Standard PDF Report', extension: '.pdf' },
      { id: 'excel', name: 'Excel Spreadhseet', extension: '.xlsx' }
    ];

    return apiResponse.success(formats, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
