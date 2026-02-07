
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { withErrorHandling } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";
import { queues } from "@/lib/queue";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Input validation schema
const exportRequestSchema = z.object({
  format: z.enum(["csv", "json", "pdf", "excel"]),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  metrics: z.array(z.string()).min(1),
  platforms: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  includeCharts: z.boolean().optional(),
  includeInsights: z.boolean().optional(),
  timezone: z.string().optional()
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate request body
  const validation = exportRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { format, dateFrom, dateTo, metrics, platforms, categories } = validation.data;

  // Validate date range
  if (new Date(dateFrom) > new Date(dateTo)) {
    return NextResponse.json(
      { error: "Invalid date range: dateFrom must be before dateTo" },
      { status: 400 }
    );
  }

  // Check subscription limits
  const subscription = await prisma.subscription.findUnique({
    where: { userId }
  });

  if (subscription) {
    if (subscription.currentExportCount >= subscription.exportLimitMonthly) {
      return NextResponse.json(
        { error: "Export limit exceeded for your plan" },
        { status: 403 }
      );
    }
  }

  // Map format to Prisma Enum (uppercase)
  // @ts-ignore
  const prismaFormat = format.toUpperCase();

  // Map categories to Prisma Enum (uppercase) if present
  // @ts-ignore
  const prismaCategories = categories ? categories.map(c => c.toUpperCase()) : [];

  // Create ExportJob
  const exportJob = await prisma.exportJob.create({
    data: {
      userId,
      format: prismaFormat as any,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      platforms: platforms || [],
      categories: prismaCategories as any,
      status: 'QUEUED',
      progress: 0
    }
  });

  // Queue export generation
  await queues.exports.add({ jobId: exportJob.id, ...validation.data });

  // Update subscription count
  if (subscription) {
    await prisma.subscription.update({
      where: { userId },
      data: { currentExportCount: { increment: 1 } }
    });
  }

  // Response
  return NextResponse.json({
    success: true,
    data: {
      jobId: exportJob.id,
      status: "queued",
      format,
      estimatedSize: "Processing...",
      estimatedTime: "Calculating...",
      statusUrl: `/api/analytics/export/status/${exportJob.id}`
    }
  });
});

// GET: Get recent export jobs
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');

  // Get recent export jobs
  const exports = await prisma.exportJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 50),
    select: {
      id: true,
      format: true,
      status: true,
      progress: true,
      dateFrom: true,
      dateTo: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      createdAt: true,
      completedAt: true,
      expiresAt: true,
      hasError: true,
      errorMessage: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      exports,
      total: exports.length,
    },
  });
});

// HEAD: Check if export endpoint is available (for auth check)
export const HEAD = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-User-Id': session.user.id,
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
