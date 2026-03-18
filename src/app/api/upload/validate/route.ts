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
    const file = formData.get('file') as File;

    if (!file) {
      return apiResponse.validationError('No file provided');
    }

    const validation = fileUploadService.validateFile(file, {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    });

    return apiResponse.success(validation, { meta: { requestId } });
  } catch (error: any) {
    return apiResponse.internalError(error.message || 'Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
