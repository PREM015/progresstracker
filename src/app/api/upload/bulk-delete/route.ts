import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";
import fileUploadService from "@/services/fileUploadService";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) {
      return apiResponse.validationError('Missing or invalid urls array');
    }

    await Promise.all(urls.map(url => fileUploadService.deleteFile(url)));

    return apiResponse.success({ message: `Successfully deleted ${urls.length} files` }, { meta: { requestId } });
  } catch (error: any) {
    return apiResponse.internalError(error.message || 'Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
