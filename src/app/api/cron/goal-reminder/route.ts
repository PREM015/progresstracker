
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// import { sendNotification } from "@/services/notificationService";

export const POST = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        // Send notification (mocked)
        // await sendNotification(reminder.user, reminder.goal);
        sent++;

        // Update nextSendAt
        // Simple daily increment for now as we don't have full frequency logic library here
        const nextSend = new Date(now);
        nextSend.setDate(now.getDate() + 1); // Default to tomorrow

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
    return NextResponse.json({ error: "Goal reminder job failed", details: e.message }, { status: 500 });
  }
};

export const GET = POST;
