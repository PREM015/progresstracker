import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    try {
        // Mocking report due computation as Prisma schema does not have scheduledReport model
        const dueReports: any[] = [];

        return NextResponse.json({
            success: true,
            data: {
                reportsFound: dueReports.length,
                reportsProcessed: 0, // Mock
                duration: Date.now() - startTime
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: "Scheduled reports failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
