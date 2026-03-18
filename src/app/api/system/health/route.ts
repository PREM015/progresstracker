import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  response.headers.set('X-Request-ID', requestId);
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const startTime = Date.now();
    let dbStatus = "ok";
    
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
    } catch (e) {
      dbStatus = "error";
    }

    const data = {
      status: dbStatus === "ok" ? "pass" : "fail",
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: dbStatus,
          time: Date.now() - startTime
        }
      }
    };

    const status = data.status === "pass" ? 200 : 503;
    const response = apiResponse.success(data, { status, meta: { requestId } });
    
    return addHeaders(response, requestId);
  } catch (error) {
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
