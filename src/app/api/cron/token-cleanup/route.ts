import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  try {
    const passwordResets = await prisma.passwordReset.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    const emailVerifications = await prisma.emailVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedPasswordResets: passwordResets.count,
        deletedEmailVerifications: emailVerifications.count,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Token cleanup failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
