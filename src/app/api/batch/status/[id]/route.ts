
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import { redis } from "@/lib/redis";

export const GET = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchId = params.id;
    const batchKey = `batch:${batchId}`;
    const batchData = await redis.get(batchKey);

    if (!batchData) {
        return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
    }

    const batch = JSON.parse(batchData as string);

    if (batch.userId !== session.user.id) {
        return NextResponse.json({ error: "Not authorized to view this batch" }, { status: 403 });
    }

    return NextResponse.json({
        success: true,
        data: {
            batchId,
            status: batch.status,
            progress: {
                completed: batch.completed,
                total: batch.total,
                failed: batch.failed,
                percentage: batch.total > 0 ? Math.round((batch.completed / batch.total) * 100) : 0
            },
            results: batch.status === 'completed' ? batch.results : null,
            startedAt: batch.startedAt,
            completedAt: batch.completedAt,
            executionTime: batch.executionTime,
            error: batch.error
        }
    });
});

// HEAD: Quick status check without full body
export const HEAD = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse(null, { status: 401 });
    }

    const batchId = params.id;
    const batchKey = `batch:${batchId}`;
    const batchData = await redis.get(batchKey);

    if (!batchData) {
        return new NextResponse(null, { status: 404 });
    }

    const batch = JSON.parse(batchData as string);

    if (batch.userId !== session.user.id) {
        return new NextResponse(null, { status: 403 });
    }

    const percentage = batch.total > 0 ? Math.round((batch.completed / batch.total) * 100) : 0;

    return new NextResponse(null, {
        status: 200,
        headers: {
            'X-Batch-Status': batch.status,
            'X-Progress-Percentage': percentage.toString(),
            'X-Completed': batch.completed.toString(),
            'X-Total': batch.total.toString(),
        },
    });
});

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

