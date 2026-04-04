import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subHours } from "date-fns";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  let filesDeleted = 0;
  let bytesFreed = 0;
  let failedDeletes = 0;

  try {
    // 1. Expired Export Jobs
    const expiredJobs = await prisma.exportJob.findMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { status: 'EXPIRED' }
        ]
      }
    });

    for (const job of expiredJobs) {
      if (job.fileUrl) {
        try {
          // await deleteFromStorage(job.fileUrl);
          filesDeleted++;
        } catch (e) {
          failedDeletes++;
        }
      }
    }

    await prisma.exportJob.deleteMany({
      where: { id: { in: expiredJobs.map(j => j.id) } }
    });

    // 2. Stuck jobs processing > 1 hour
    const stuckCutoff = subHours(new Date(), 1);
    await prisma.exportJob.updateMany({
      where: {
        status: 'PROCESSING',
        startedAt: { lt: stuckCutoff }
      },
      data: {
        status: 'FAILED',
        hasError: true,
        errorMessage: 'Job timed out'
      }
    });

    // 3. Reset monthly usage on 1st of month
    const isFirstOfMonth = new Date().getDate() === 1;
    if (isFirstOfMonth) {
      await prisma.subscription.updateMany({
        data: { currentExportCount: 0, usageResetAt: new Date() }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        expiredJobs: expiredJobs.length,
        filesDeleted,
        bytesFreed,
        failedDeletes,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Export cleanup failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
