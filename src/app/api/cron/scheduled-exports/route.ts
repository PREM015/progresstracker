import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    try {
        // Find due exports
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
                exportsProcessed: 0, // Mock
                duration: Date.now() - startTime
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: "Scheduled exports failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
