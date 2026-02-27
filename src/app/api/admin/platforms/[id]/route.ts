
import { NextRequest } from "next/server";
import { success, notFound, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import { AuditAction } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import CacheService from "@/services/cacheService";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => { // Updated
  try {
    const authRes = await adminAuth(req);
    if (authRes) return authRes;

    const { id } = await params;

    const platform = await prisma.platform.findUnique({
      where: { id }
    });

    if (!platform) return notFound("Platform"); // Changed notFoundError to notFound

    // Stats
    const [
      totalUsers,
      activeUsers,
      recentSyncs,
      recentErrors,
      syncStats
    ] = await Promise.all([
      prisma.userPlatform.count({ where: { platformId: id } }),
      prisma.userPlatform.count({
        where: { platformId: id, lastSyncedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      }),
      prisma.syncLog.count({ where: { platformId: id } }),
      prisma.syncLog.count({
        where: { platformId: id, hasError: true, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
      prisma.syncLog.aggregate({
        where: { platformId: id },
        _avg: { duration: true }
      })
    ]);

    const recentSyncLogs = await prisma.syncLog.findMany({
      where: { platformId: id },
      take: 10,
      orderBy: { createdAt: "desc" }
    });

    return success({
      platform,
      stats: {
        totalUsers,
        activeUsers,
        totalSyncs: recentSyncs,
        recentSyncs: recentSyncs,
        recentErrors,
        avgSyncDuration: syncStats._avg.duration || 0,
        successRate: recentSyncs > 0 ? ((recentSyncs - recentErrors) / recentSyncs) * 100 : 100
      },
      recentSyncLogs
    });
  } catch (err: any) {
    return internalError(err.message);
  }
};

export const PUT = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => { // Updated
  try {
    const authRes = await adminAuth(req);
    if (authRes) return authRes;

    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const adminId = token?.sub;

    const body = await req.json();

    // Validate platform exists
    const existing = await prisma.platform.findUnique({ where: { id } });
    if (!existing) return notFound("Platform"); // Changed notFoundError to notFound

    // Update
    const updated = await prisma.platform.update({
      where: { id },
      data: body
    });

    // Invalidate cache
    CacheService.delete(`platform:${id}`);

    if (adminId) {
      await auditLogService.create({
        userId: adminId,
        action: "ADMIN_ACTION" as AuditAction,
        category: "platform",
        description: `Updated platform: ${existing.name}`,
        changes: { old: existing, new: updated } as any,
        entityId: id,
        entityType: "platform"
      });
    }

    return success({ platform: updated });
  } catch (err: any) {
    return internalError(err.message);
  }
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => { // Updated
  try {
    const authRes = await adminAuth(req);
    if (authRes) return authRes;

    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const adminId = token?.sub;

    const existing = await prisma.platform.findUnique({ where: { id } });
    if (!existing) return notFound("Platform"); // Changed notFoundError to notFound

    // Soft delete
    await prisma.platform.update({
      where: { id },
      data: { isActive: false }
    });

    if (adminId) {
      await auditLogService.create({
        userId: adminId,
        action: "ADMIN_ACTION" as AuditAction, // DELETE
        category: "platform",
        description: `Deactivated platform: ${existing.name}`,
        entityId: id,
        entityType: "platform"
      });
    }

    return success({ message: "Platform deactivated" });
  } catch (err: any) {
    return internalError(err.message);
  }
};