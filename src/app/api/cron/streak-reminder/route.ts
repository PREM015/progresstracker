import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  try {
    const users = await prisma.user.count({
      where: {
        currentStreak: { gt: 0 },
        notificationPrefs: { is: { emailEnabled: true } }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        eligibleUsers: users,
        remindersSent: 0, // Placeholder for actual send logic
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Streak reminder failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
