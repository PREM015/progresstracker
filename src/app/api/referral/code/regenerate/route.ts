import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required');
    }

    const userId = session.user.id;

    // Get user's current referral code
    const currentReferral = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, referralExpires: true } as any,
    });

    if (!currentReferral) {
      return apiResponse.notFound('User not found');
    }

    // Generate new unique referral code
   let newCode = '';
    let isUnique = false;
    while (!isUnique) {
      newCode = nanoid(8).toUpperCase();
      const existing = await prisma.user.findFirst({
        where: { referralCode: newCode, id: { not: userId } },
      });
      if (!existing) isUnique = true;
    }

    // Update user with new referral code
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        referralCode: newCode,
        referralExpires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      } as any,
      select: {
        id: true,
        referralCode: true,
        referralExpires: true,
        referralCount: true,
      } as any,
    });

    logger.info('Referral code regenerated', { userId });

    return apiResponse.success({
      referralCode: updated.referralCode,
      referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}/join?ref=${updated.referralCode}`,
      expiresAt: updated.referralExpires,
      totalReferrals: updated.referralCount,
    });
  } catch (error) {
    logger.error('Referral code regeneration failed', {}, error);
    return apiResponse.internalError('Failed to regenerate referral code');
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
