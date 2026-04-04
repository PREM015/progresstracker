import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const frequency = searchParams.get("frequency") || "weekly";

  const startTime = Date.now();

  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        notificationPrefs: {
          emailEnabled: true,
          digestEnabled: true,
          digestFrequency: frequency
        }
      },
      include: { notificationPrefs: true }
    });

    let sent = 0;
    let skipped = 0;

    const now = new Date();
    const periodStart = frequency === 'daily' ? subDays(now, 1) : subDays(now, 7);

    for (const user of users) {
      const activityCount = await prisma.trackerEntry.count({
        where: {
          userId: user.id,
          date: { gte: periodStart }
        }
      });

      if (activityCount === 0) {
        skipped++;
        continue;
      }

      // Send email (placeholder)
      // await sendEmail({ to: user.email, template: 'digest', data: { ... } });
      sent++;
    }

    return NextResponse.json({
      success: true,
      data: {
        frequency,
        eligibleUsers: users.length,
        emailsSent: sent,
        skipped,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Digest failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
