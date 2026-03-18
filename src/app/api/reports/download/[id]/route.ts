import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const requestId = crypto.randomUUID();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const report = await prisma.report.findUnique({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!report) {
      return apiResponse.notFound('Report', requestId);
    }

    // Since this is a demo, we will output the JSON data as a downloadable file
    // In a real application, you would generate a PDF from report.data
    const dataString = JSON.stringify(report.data, null, 2);
    
    return new Response(dataString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="report_${report.type}_${report.id.substring(0,8)}.json"`
      }
    });

  } catch (err: any) {
    return apiResponse.internalError('Failed to download report', requestId);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
