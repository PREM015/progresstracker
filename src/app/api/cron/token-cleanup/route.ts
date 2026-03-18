import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    try {
        const passwordResets = await prisma.passwordReset.deleteMany({
            where: { expiresAt: { lt: new Date() } }
        });

        const emailVerifications = await prisma.emailVerification.deleteMany({
            where: { expiresAt: { lt: new Date() } }
        });

        return NextResponse.json({
            success: true,
            data: {
                deletedPasswordResets: passwordResets.count,
                deletedEmailVerifications: emailVerifications.count,
                duration: Date.now() - startTime
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: "Token cleanup failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
