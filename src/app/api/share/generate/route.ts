import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";
import crypto from "crypto";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }
    
    const body = await request.json();
    const { type, entityId, settings } = body;

    // Mock share creation logic
    const shareCode = crypto.randomBytes(8).toString('hex');
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareCode}`;

    const newShare = {
        id: `share-${crypto.randomBytes(4).toString('hex')}`,
        code: shareCode,
        url: shareUrl,
        type,
        entityId,
        settings: settings || {}
    };

    return apiResponse.created(newShare, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
