import { NextRequest, NextResponse } from "next/server";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  try {
    // Placeholder — scheduledReport model not yet in schema
    const dueReports: unknown[] = [];

    return NextResponse.json({
      success: true,
      data: {
        reportsFound: dueReports.length,
        reportsProcessed: 0,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Scheduled reports failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
