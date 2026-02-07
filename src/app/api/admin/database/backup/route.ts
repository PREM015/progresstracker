
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, error } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import { getToken } from "next-auth/jwt";
import auditLogService from "@/services/auditLogService";
import { AuditAction } from "@prisma/client";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  // Mock implementation for listing backups
  // In a real scenario, list from S3/Storage
  return success({
    backups: [
      {
        id: "backup-mock-1",
        type: "full",
        size: "256 MB",
        sizeBytes: 268435456,
        status: "completed",
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        downloadUrl: null,
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      }
    ],
    totalSize: "256 MB",
    backupCount: 1
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const { type = "full" } = body;

  // Simulate backup trigger
  // In production: trigger pg_dump or provider API

  if (adminId) {
    await auditLogService.create({
      userId: adminId,
      action: "ADMIN_ACTION" as AuditAction, // "BACKUP" fallback
      category: "database",
      description: `Triggered ${type} database backup`
    });
  }

  return success({
    backupId: "pending-" + Date.now(),
    status: "in_progress",
    estimatedDuration: "5-10 minutes",
    message: "Backup job started successfully"
  });
});
