import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  try {
    const dueExports = await prisma.scheduledExport.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: new Date() }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        exportsFound: dueExports.length,
        exportsProcessed: 0, // Placeholder for actual processing
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Scheduled exports failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
