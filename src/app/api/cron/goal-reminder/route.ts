import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  const now = new Date();

  try {
    // Find due reminders
    const dueReminders = await prisma.goalReminder.findMany({
      where: {
        isActive: true,
        nextSendAt: { lte: now },
        goal: { status: 'ACTIVE' }
      },
      include: {
        goal: true,
        user: true
      }
    });

    let sent = 0;
    let failed = 0;

    for (const reminder of dueReminders) {
      try {
        // Send notification (placeholder)
        // await sendNotification(reminder.user, reminder.goal);
        sent++;

        // Update nextSendAt
        const nextSend = new Date(now);
        nextSend.setDate(now.getDate() + 1);

        await prisma.goalReminder.update({
          where: { id: reminder.id },
          data: {
            lastSentAt: now,
            sendCount: { increment: 1 },
            nextSendAt: nextSend
          }
        });
      } catch (e) {
        failed++;
        console.error(`Failed to send reminder ${reminder.id}`, e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        remindersProcessed: dueReminders.length,
        sent,
        failed,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Goal reminder job failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
