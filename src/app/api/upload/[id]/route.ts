import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";
import fileUploadService from "@/services/fileUploadService";

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const id = (await params).id;
    // Mock URL for metadata lookup
    const fileUrl = `/uploads/general/${id}`;
    const metadata = await fileUploadService.getFileMetadata(fileUrl);

    if (!metadata) {
      return apiResponse.notFound('File', requestId);
    }

    return apiResponse.success(metadata, { meta: { requestId } });
  } catch (error: any) {
    return apiResponse.internalError(error.message || 'Operation failed', requestId);
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const id = (await params).id;
    const fileUrl = `/uploads/general/${id}`;
    
    await fileUploadService.deleteFile(fileUrl);

    return apiResponse.success({ message: 'File deleted' }, { meta: { requestId } });
  } catch (error: any) {
    return apiResponse.internalError(error.message || 'Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
