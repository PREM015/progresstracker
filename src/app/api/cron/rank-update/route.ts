import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { totalPoints: 'desc' },
      select: { id: true, totalPoints: true, rank: true }
    });

    let rank = 1;
    const updatePromises = [];

    for (let i = 0; i < users.length; i++) {
      if (i > 0 && users[i].totalPoints < users[i - 1].totalPoints) {
        rank = i + 1;
      }

      if (users[i].rank !== rank) {
        updatePromises.push(prisma.user.update({
          where: { id: users[i].id },
          data: { rank }
        }));
      }
    }

    if (updatePromises.length > 0) {
      await prisma.$transaction(updatePromises);
    }

    return NextResponse.json({
      success: true,
      data: {
        usersProcessed: users.length,
        ranksUpdated: updatePromises.length,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Rank update failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
