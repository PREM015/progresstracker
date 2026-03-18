import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        return NextResponse.json({ error: "Session cleanup failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
