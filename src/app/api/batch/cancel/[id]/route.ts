
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma"; // Assuming prisma is used for batch cancel if it's async
import { redis } from "@/lib/redis"; // If using redis

export const POST = withErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchId = (await params).id;

    // Logic depends on how batch jobs are stored.
    // The prompt mentions "Status: queued | processing" and "Redis for job state".
    // I will assume we check Redis or Database.

    // Check if batch exists
    // For async batches, we might use Redis key `batch:${batchId}`

    const batchKey = `batch:${batchId}`;
    const batchData = await redis.get(batchKey);

    if (!batchData) {
        return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
    }

    const batch = JSON.parse(batchData as string);

    if (batch.userId !== session.user.id) {
        return NextResponse.json({ error: "Not authorized to cancel this batch" }, { status: 403 });
    }

    if (batch.status === 'completed') {
        return NextResponse.json({ error: "Batch job already completed" }, { status: 400 });
    }

    if (batch.status === 'cancelled') {
        return NextResponse.json({ error: "Batch job already cancelled" }, { status: 400 });
    }

    // Set cancelled flag
    // In a real queue system, we might need to call queue.remove(jobId) or similar.
    // Here we'll just update the status in Redis so the worker knows to stop.

    batch.status = 'cancelled';
    batch.cancelledAt = new Date().toISOString();
    // Calculate stats based on current progress
    const cancelledOps = batch.total - batch.completed;
    batch.cancelledOperations = cancelledOps;

    await redis.set(batchKey, JSON.stringify(batch));

    return NextResponse.json({
        success: true,
        data: {
            batchId,
            status: "cancelled",
            completedOperations: batch.completed,
            cancelledOperations: cancelledOps,
            cancelledAt: batch.cancelledAt
        }
    });
});

// GET: Check if batch can be cancelled (returns current status)
export const GET = withErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchId = (await params).id;
    const batchKey = `batch:${batchId}`;
    const batchData = await redis.get(batchKey);

    if (!batchData) {
        return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
    }

    const batch = JSON.parse(batchData as string);

    if (batch.userId !== session.user.id) {
        return NextResponse.json({ error: "Not authorized to view this batch" }, { status: 403 });
    }

    const canCancel = batch.status !== 'completed' && batch.status !== 'cancelled';

    return NextResponse.json({
        success: true,
        data: {
            batchId,
            status: batch.status,
            canCancel,
            reason: !canCancel ? `Batch is already ${batch.status}` : null,
        }
    });
});

// HEAD: Check if batch exists and user has access
export const HEAD = withErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse(null, { status: 401 });
    }

    const batchId = (await params).id;
    const batchKey = `batch:${batchId}`;
    const batchData = await redis.get(batchKey);

    if (!batchData) {
        return new NextResponse(null, { status: 404 });
    }

    const batch = JSON.parse(batchData as string);

    if (batch.userId !== session.user.id) {
        return new NextResponse(null, { status: 403 });
    }

    const canCancel = batch.status !== 'completed' && batch.status !== 'cancelled';

    return new NextResponse(null, {
        status: 200,
        headers: {
            'X-Batch-Status': batch.status,
            'X-Can-Cancel': canCancel.toString(),
        },
    });
});

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

