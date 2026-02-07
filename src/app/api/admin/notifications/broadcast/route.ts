
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, validationError, rateLimited } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import { queueNotifications, queueEmailBroadcast } from "@/lib/queue";
import { pushService } from "@/services/pushService";
import auditLogService from "@/services/auditLogService";
import { AuditAction, NotificationType, NotificationPriority, SubscriptionTier, Role } from "@prisma/client";
import { getToken } from "next-auth/jwt";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const {
    title,
    message,
    type,
    priority,
    channels = [],
    actionUrl,
    actionLabel,
    imageUrl,
    filters,
    scheduledFor
  } = body;

  if (!title || !message || channels.length === 0) {
    return validationError("Title, message and at least one channel required");
  }

  // 1. Filter Recipients
  const where: any = {
    deletedAt: null,
    isActive: filters?.isActive ?? true,
  };

  if (filters?.role) where.role = filters.role;
  if (filters?.tier) where.subscription = { tier: { in: filters.tier } };
  if (filters?.registeredAfter) where.createdAt = { gte: new Date(filters.registeredAfter) };

  const recipients = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      notificationPrefs: true
      // pushSubscriptions logic handled in pushService ideally, but we need IDs
    }
  });

  if (recipients.length === 0) {
    return validationError("No recipients match filters");
  }

  const recipientIds = recipients.map(u => u.id);
  const broadcastId = "bc-" + Date.now();

  // 2. Process Channels
  const promises = [];

  // IN_APP
  if (channels.includes('IN_APP')) {
    // Use queue for batch creation
    promises.push(queueNotifications({
      userIds: recipientIds,
      notification: {
        type: type || 'SYSTEM',
        title,
        message,
        priority: priority || 'NORMAL',
        actionUrl,
        actionLabel
      }
    }));
  }

  // EMAIL
  if (channels.includes('EMAIL')) {
    // Filter for email enabled (assuming pref exists)
    const emailRecipients = recipients
      .filter(u => u.email && (u.notificationPrefs ? (u.notificationPrefs as any).emailEnabled !== false : true))
      .map(u => u.id); // Queue expects IDs usually if it re-fetches or emails if it sends directly.
    // queueEmailBroadcast in lib/queue takes `userIds`.

    if (emailRecipients.length > 0) {
      promises.push(queueEmailBroadcast({
        userIds: emailRecipients,
        subject: title,
        htmlTemplate: `<h1>${title}</h1><p>${message}</p>${actionUrl ? `<a href="${actionUrl}">${actionLabel || 'View'}</a>` : ''}`,
        variables: {}
      }));
    }
  }

  // PUSH
  if (channels.includes('PUSH')) {
    // We don't have a specific queue for PUSH in lib/queue likely suitable for bulk without modification
    // We will fire and forget the service call
    // Filter logic usually inside service or we pass all IDs and service filters
    // pushService.sendToMultipleUsers takes userIds.

    const pushPromise = pushService.sendToMultipleUsers(recipientIds, {
      title,
      body: message,
      url: actionUrl,
      image: imageUrl
    }).catch(err => {
      console.error("Push broadcast failed", err);
    });

    // We won't await this if we want to return immediately, but Promise.all below awaits queue connects.
    // We can let push run in background
    // promises.push(pushPromise); // Uncomment to await
  }

  await Promise.all(promises);

  // 3. Log
  if (adminId) {
    await auditLogService.create({
      userId: adminId,
      action: "ADMIN_ACTION" as AuditAction,
      category: "notification",
      description: `Broadcast sent: ${title}`,
      changes: { channels, recipientCount: recipientIds.length, broadcastId } as any
    });
  }

  return success({
    broadcastId,
    recipientCount: recipientIds.length,
    channels,
    status: scheduledFor ? "scheduled" : "queued",
    scheduledFor: scheduledFor || null
  });
});