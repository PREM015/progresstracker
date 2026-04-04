import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  try {
    const sessionCutoff = subDays(new Date(), 30);
    const result = await prisma.activeSession.deleteMany({
      where: {
        OR: [
          { lastActiveAt: { lt: sessionCutoff } },
          { expiresAt: { lt: new Date() } }
        ]
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedSessions: result.count,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Session cleanup failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
