import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  try {
    const usersCount = await prisma.user.count();
    const entriesCount = await prisma.trackerEntry.count();

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: usersCount,
        totalEntries: entriesCount,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Stats aggregation failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
