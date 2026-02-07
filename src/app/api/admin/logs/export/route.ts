
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, validationError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import auditLogService from "@/services/auditLogService";
import { AuditAction } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import fs from "fs/promises";
import path from "path";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const {
    format = "csv",
    dateFrom,
    dateTo,
    userId,
    action,
    category
  } = body;

  // 1. Fetch Logs
  const filters: any = { limit: 10000 }; // Hard limit 10k for now
  if (dateFrom) filters.startDate = new Date(dateFrom);
  if (dateTo) filters.endDate = new Date(dateTo);
  if (userId) filters.userId = userId;
  if (action) filters.action = action;
  if (category) filters.category = category;

  const result = await auditLogService.getLogs(filters);
  const logs = result.logs;

  if (logs.length === 0) {
    return validationError("No logs found to export");
  }

  // 2. Generate Content
  let content = "";
  let mimeType = "text/plain";
  let extension = "txt";

  if (format === "json") {
    content = JSON.stringify(logs, null, 2);
    mimeType = "application/json";
    extension = "json";
  } else {
    // CSV
    mimeType = "text/csv";
    extension = "csv";
    const headers = ["ID", "Timestamp", "Action", "User ID", "Category", "Description", "IP"];
    content = headers.join(",") + "\n";
    content += logs.map(log => {
      return [
        log.id,
        log.createdAt.toISOString(),
        log.action,
        log.userId || "",
        log.category || "",
        `"${(log.description || "").replace(/"/g, '""')}"`, // Escape quotes
        log.ipAddress || ""
      ].join(",");
    }).join("\n");
  }

  // 3. Save to file
  // Save to public/uploads/exports (ensure it exists)
  const filename = `logs-export-${Date.now()}.${extension}`;
  const exportDir = path.join(process.cwd(), "public", "uploads", "exports");
  await fs.mkdir(exportDir, { recursive: true });
  await fs.writeFile(path.join(exportDir, filename), content);

  const downloadUrl = `/uploads/exports/${filename}`;

  // 4. Log Export Action
  if (adminId) {
    await auditLogService.create({
      userId: adminId,
      action: "ADMIN_ACTION" as AuditAction, // "EXPORT_DATA" fallback
      category: "audit",
      description: "Exported audit logs",
      changes: { count: logs.length, format } as any
    });
  }

  return success({
    downloadUrl,
    fileName: filename,
    recordCount: logs.length,
    fileSize: (content.length / 1024).toFixed(2) + " KB",
    expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
  });
});
