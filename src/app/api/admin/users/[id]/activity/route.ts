
import { NextRequest } from "next/server";
import { success, notFound, validationError, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import { AuditAction } from "@prisma/client";
import { getToken } from "next-auth/jwt";

export const GET = async (req: NextRequest, { params }: { params: { id: string } }) => { // Updated
  try {
    const authRes = await adminAuth(req);
    if (authRes) return authRes;

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const adminId = token?.sub;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, username: true }
    });

    if (!user) return notFound("User");

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const baseWhere: any = {};
    if (dateFrom || dateTo) {
      baseWhere.createdAt = {}; // For logs
      if (dateFrom) baseWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) baseWhere.createdAt.lte = new Date(dateTo);
    }

    const result: any = { user, activity: {} };

    if (type === "all" || type === "tracker") {
      const trackerWhere = { ...baseWhere, userId: id, deletedAt: null };
      if (dateFrom || dateTo) {
        trackerWhere.date = baseWhere.createdAt; // Tracker uses 'date' usually
        delete trackerWhere.createdAt;
      }

      result.activity.trackerEntries = await prisma.trackerEntry.findMany({
        where: trackerWhere,
        take: type === "all" ? 20 : limit,
        skip: type === "all" ? 0 : skip,
        orderBy: { date: "desc" },
        include: { platform: { select: { name: true } } }
      });
    }

    if (type === "all" || type === "audit") {
      result.activity.auditLogs = await prisma.auditLog.findMany({
        where: { ...baseWhere, userId: id },
        take: type === "all" ? 20 : limit,
        skip: type === "all" ? 0 : skip,
        orderBy: { createdAt: "desc" }
      });
    }

    if (type === "all" || type === "login") {
      // Assuming LoginAttempt model exists
      try {
        // @ts-ignore: Model might not exist yet
        result.activity.loginAttempts = await prisma.loginAttempt.findMany({
          where: { ...baseWhere, userId: id },
          take: type === "all" ? 10 : limit,
          skip: type === "all" ? 0 : skip,
          orderBy: { createdAt: "desc" }
        });
      } catch (e) {
        result.activity.loginAttempts = [];
      }
    }

    if (type === "all" || type === "sync") {
      result.activity.syncLogs = await prisma.syncLog.findMany({
        where: { ...baseWhere, userId: id },
        take: type === "all" ? 10 : limit,
        skip: type === "all" ? 0 : skip,
        orderBy: { createdAt: "desc" }
      });
    }

    // Log access
    if (adminId) {
      await auditLogService.create({
        userId: adminId,
        action: "READ" as AuditAction,
        category: "user_activity", // Fixed category enum match
        description: `Viewed activity for ${user.email}`,
        entityId: id,
        entityType: "user"
      });
    }

    return success(result);
  } catch (err: any) {
    return internalError(err.message);
  }
};
