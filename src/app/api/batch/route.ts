
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import { z } from "zod";

const batchOperationSchema = z.object({
    id: z.string(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z.string(),
    body: z.any().optional(),
    headers: z.record(z.string()).optional()
});

const batchRequestSchema = z.object({
    operations: z.array(batchOperationSchema).min(1).max(20),
    stopOnError: z.boolean().optional(),
    parallel: z.boolean().optional()
});

const ALLOWED_PATHS = [
    '/api/goals', '/api/goals/',
    '/api/tracker', '/api/tracker/',
    '/api/achievements', '/api/achievements/',
    '/api/platforms', '/api/platforms/',
    '/api/notifications', '/api/notifications/',
    '/api/stats', '/api/stats/',
    '/api/user', '/api/user/'
];

function isAllowedPath(path: string) {
    if (path.includes('/api/batch')) return false; // No recursion
    if (path.includes('/api/admin')) return false; // No admin
    return ALLOWED_PATHS.some(allowed => path.startsWith(allowed));
}

export const POST = withErrorHandling(async (req: Request) => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const validation = batchRequestSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: "Invalid request", details: validation.error.format() },
            { status: 400 }
        );
    }

    const { operations, stopOnError = false, parallel = false } = validation.data;
    const results = [];
    const summary = { total: operations.length, succeeded: 0, failed: 0, skipped: 0 };
    const startTime = Date.now();

    const executeOperation = async (op: z.infer<typeof batchOperationSchema>) => {
        if (!isAllowedPath(op.path)) {
            return {
                id: op.id,
                status: 403,
                success: false,
                error: "Operation path not allowed"
            };
        }

        try {
            // Construct full URL including query params if any
            // Note: This internal fetch assumes we can hit localhost or relative
            // In Next.js App Router, it's often better to call services directly rather than self-fetching
            // But based on prompt "Make internal fetch with user's auth context", we will try fetch.
            // However, usually self-fetch requires an absolute URL.
            // We'll use the request URL to get the origin.
            const baseUrl = new URL(req.url).origin;
            const url = new URL(op.path, baseUrl);

            const headers = new Headers(req.headers);
            // We should probably keep the auth headers (Cookie/Authorization)
            // and add any custom headers from the op.
            if (op.headers) {
                Object.entries(op.headers).forEach(([k, v]) => headers.set(k, v));
            }

            // We might need to handle content-type if body is present
            if (op.body) {
                headers.set('Content-Type', 'application/json');
            }

            const response = await fetch(url.toString(), {
                method: op.method,
                headers: headers,
                body: op.body ? JSON.stringify(op.body) : undefined,
                cache: 'no-store'
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            return {
                id: op.id,
                status: response.status,
                success: response.ok,
                data: response.ok ? data : undefined,
                error: !response.ok ? (typeof data === 'string' ? data : JSON.stringify(data)) : null
            };
        } catch (err: any) {
            return {
                id: op.id,
                status: 500,
                success: false,
                error: err.message || "Internal Error"
            };
        }
    };

    if (parallel) {
        const promises = operations.map(op => executeOperation(op));
        const opResults = await Promise.all(promises);
        results.push(...opResults);
    } else {
        for (const op of operations) {
            if (stopOnError && summary.failed > 0) {
                summary.skipped++;
                results.push({
                    id: op.id,
                    status: 0,
                    success: false,
                    error: "Skipped due to previous error"
                });
                continue;
            }
            const result = await executeOperation(op);
            results.push(result);
            if (!result.success) summary.failed++;
            else summary.succeeded++;
        }
    }

    if (parallel) {
        summary.succeeded = results.filter(r => r.success).length;
        summary.failed = results.filter(r => !r.success).length;
    }

    return NextResponse.json({
        success: true,
        data: {
            results,
            summary,
            executionTime: Date.now() - startTime
        }
    });
});

// GET: Get batch job history for the user
export const GET = withErrorHandling(async (req: Request) => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Since batch operations are synchronous, we don't have a job history table
    // Return a placeholder response or implement actual tracking if needed
    return NextResponse.json({
        success: true,
        data: {
            message: "Batch operations are executed synchronously. No job history available.",
            note: "Consider using /api/batch/status/[id] for async batch tracking if implemented."
        }
    });
});

// HEAD: Check if batch endpoint is available
export const HEAD = withErrorHandling(async (req: Request) => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse(null, { status: 401 });
    }

    return new NextResponse(null, {
        status: 200,
        headers: {
            'X-Max-Operations': '20',
            'X-Supports-Parallel': 'true',
        },
    });
});

// OPTIONS: CORS preflight and method discovery
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

