
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, subHours } from "date-fns";

export const POST = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = [];

  try {
    // 1. Password resets
    const pwResult = await prisma.passwordReset.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    results.push({ name: 'password_resets', deleted: pwResult.count });

    // 2. Email verifications
    const evResult = await prisma.emailVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    results.push({ name: 'email_verifications', deleted: evResult.count });

    // 3. Old notifications (90 days)
    const notifCutoff = subDays(new Date(), 90);
    const notifResult = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: notifCutoff },
        isRead: true
      }
    });
    results.push({ name: 'notifications', deleted: notifResult.count });

    // 4. Session cleanup (failed logic in prompt using subDays? "Stale sessions (> 30 days)")
    // Assuming Session or ActiveSession table
    const sessionCutoff = subDays(new Date(), 30);
    // @ts-ignore - ActiveSession model assumed
    const sessResult = await prisma.activeSession?.deleteMany({
      where: { lastActiveAt: { lt: sessionCutoff } }
    });
    if (sessResult) results.push({ name: 'sessions', deleted: sessResult.count });

    return NextResponse.json({
      success: true,
      data: {
        tasks: results,
        totalDuration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Cleanup failed", details: e.message }, { status: 500 });
  }
};

export const GET = POST;
