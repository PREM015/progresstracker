// src/app/api/upload/presigned/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return apiResponse.unauthorized('Authentication required', requestId);
        }

        const body = await request.json();
        const { filename, contentType } = body;

        if (!filename || !contentType) {
            return apiResponse.validationError('Missing filename or contentType');
        }

        // Dynamic import prevents Turbopack from statically tracing
        // fileUploadService's fs/path operations at build time,
        // eliminating the NFT whole-project warning from next.config.ts.
        const { default: fileUploadService } = await import(
            '@/services/fileUploadService'
        );

        const presigned = await fileUploadService.generatePresignedUrl(
            filename,
            contentType,
            session.user.id
        );

        return apiResponse.success(presigned, { meta: { requestId } });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Operation failed';
        return apiResponse.internalError(message, requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}