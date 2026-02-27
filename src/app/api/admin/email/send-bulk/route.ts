
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, validationError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import { emailTask } from "@/trigger/email-task";
import { AuditAction, SubscriptionTier } from "@prisma/client";
import { getToken } from "next-auth/jwt";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const {
    subject,
    htmlContent,
    filters = {},
    testMode
  } = body;

  if (!subject || !htmlContent) {
    return validationError("Subject and htmlContent are required");
  }

  // 1. Determine Recipients
  let recipients: { id: string, email: string }[] = [];

  if (testMode && adminId) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (admin && admin.email) {
      recipients = [{ id: admin.id, email: admin.email }];
    }
  } else {
    // Build filter
    const where: any = {
      deletedAt: null,
      isActive: filters.isActive ?? true, // Default to active only unless specified
    };

    if (filters.role) where.role = filters.role;
    if (filters.tier) where.subscription = { tier: filters.tier as SubscriptionTier };
    if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;

    // Only fetch users who haven't disabled emails (assuming notificationPrefs relation)
    // Complex filtering on related fields might need careful query construction
    // For now fetching users and their prefs

    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, notificationPrefs: true }
    });

    // Filter in memory for preferences
    recipients = users.filter(u =>
      u.email &&
      (u.notificationPrefs?.marketingEmails !== false) // Default to true if not set
    ).map(u => ({ id: u.id, email: u.email! }));
  }

  if (recipients.length === 0) {
    return validationError("No recipients match filters");
  }

  // 2. Queue Job
  // queueEmailBroadcast expects { userIds, ... }
  const userIds = recipients.map(r => r.id);

  // Create chunks if too many recipients (Queue handles it but safer to batch here if millions)
  // For now assuming reasonable size handled by queue processor

  const handle = await emailTask.trigger({
    userIds,
    subject: testMode ? `[TEST] ${subject}` : subject,
    htmlTemplate: htmlContent,
  });
  const jobId = handle.id;

  // 3. Log Action
  if (adminId) {
    await auditLogService.create({
      userId: adminId,
      action: "ADMIN_ACTION" as AuditAction,
      category: "email",
      description: `Triggered bulk email: ${subject}`,
      changes: {
        recipientCount: recipients.length,
        testMode,
        jobId
      } as any
    });
  }

  return success({
    jobId,
    recipientCount: recipients.length,
    status: "queued",
    testMode: !!testMode
  });
});
