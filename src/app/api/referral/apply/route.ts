import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";
import referralService from "@/services/referralService";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const { code } = await request.json();
    if (!code) {
      return apiResponse.validationError('Referral code is required');
    }

    const success = await referralService.applyReferralCode(session.user.id, code);

    if (success) {
      return apiResponse.success({ message: 'Referral code applied successfully' }, { meta: { requestId } });
    } else {
      return apiResponse.validationError('Invalid referral code');
    }
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
