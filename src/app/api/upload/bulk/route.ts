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

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return apiResponse.validationError('No files provided');
    }

    const results = await Promise.all(
        files.map(file => fileUploadService.uploadFile(file, session.user.id))
    );

    return apiResponse.success(results, { meta: { requestId } });
  } catch (error: any) {
    return apiResponse.internalError(error.message || 'Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
