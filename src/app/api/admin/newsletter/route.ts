
import { NextRequest } from "next/server";
import { withErrorHandling, conflictError } from "@/lib/apiHandler";
import { success, validationError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import { AuditAction } from "@prisma/client";
import { getToken } from "next-auth/jwt";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const skip = (page - 1) * limit;
  const where: any = {};

  if (status === "active") where.isActive = true;
  else if (status === "unsubscribed") where.isActive = false;

  if (search) {
    where.email = { contains: search, mode: "insensitive" };
  }

  const [total, subscribers] = await Promise.all([
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    })
  ]);

  // Aggregate stats
  const stats = await prisma.newsletterSubscriber.groupBy({
    by: ['isActive'],
    _count: true
  });

  const activeCount = stats.find(s => s.isActive)?._count || 0;
  const unsubscribedCount = stats.find(s => !s.isActive)?._count || 0;

  return success({
    subscribers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    stats: {
      total: activeCount + unsubscribedCount,
      active: activeCount,
      unsubscribed: unsubscribedCount
    }
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const { email } = body;

  if (!email) return validationError("Email required");

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) return conflictError("Subscriber already exists");

  const subscriber = await prisma.newsletterSubscriber.create({
    data: {
      email,
      isActive: true,
      confirmedAt: new Date(),
      // source: "admin_manual" // Field does not exist in schema
    }
  });

  if (adminId) {
    await auditLogService.create({
      userId: adminId,
      action: "ADMIN_ACTION" as AuditAction,
      category: "newsletter",
      description: `Added subscriber: ${email}`
    });
  }

  return success({ subscriber });
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return validationError("IDs array required");
  }

  const result = await prisma.newsletterSubscriber.deleteMany({
    where: { id: { in: ids } }
  });

  if (adminId) {
    await auditLogService.create({
      userId: adminId,
      action: "ADMIN_ACTION" as AuditAction,
      category: "newsletter",
      description: `Deleted ${result.count} subscribers`
    });
  }

  return success({ deleted: result.count });
});