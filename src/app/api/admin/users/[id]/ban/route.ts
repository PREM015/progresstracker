
import { NextRequest } from "next/server";
import { success, notFound, validationError, forbidden, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import SessionService from "@/services/sessionService";
import { sendEmail } from "@/lib/email";
import { AuditAction } from "@prisma/client";
import { getToken } from "next-auth/jwt";

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => { // Updated
  try {
    const authRes = await adminAuth(req);
    if (authRes) return authRes;

    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const adminId = token?.sub;

    const body = await req.json();
    const { reason, notifyUser = true, duration } = body;

    if (!reason) return validationError("Ban reason is required");
    if (id === adminId) return validationError("Cannot ban yourself");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User");

    if (user.role === 'admin' || user.isAdmin) {
      return validationError("Cannot ban other admins");
    }

    if (user.isBanned) return validationError("Conflict: User is already banned");

    // Apply ban
    const bannedAt = new Date();
    const banData: any = {
      isBanned: true,
      banReason: reason,
      bannedAt,
      bannedBy: adminId
    };

    await prisma.user.update({
      where: { id },
      data: banData
    });

    // Invalidate sessions
    const sessionResult = await SessionService.revokeAllSessions(id, "user_banned");
    await SessionService.revokeAllRefreshTokens(id, "user_banned");

    // Notification
    let notificationSent = false;
    if (notifyUser && user.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Account Suspended",
          html: `<p>Your account has been suspended.</p><p>Reason: ${reason}</p><p>Duration: ${duration || "Permanent"}</p>`
        });
        notificationSent = true;
      } catch (e) {
        console.error("Failed to send ban email", e);
      }
    }

    // Log
    if (adminId) {
      await auditLogService.create({
        userId: adminId,
        action: "ADMIN_ACTION" as AuditAction,
        category: "user_ban",
        description: `User banned: ${user.username}`,
        changes: { reason, duration } as any,
        entityId: id,
        entityType: "user"
      });
    }

    return success({
      userId: id,
      isBanned: true,
      bannedAt: bannedAt.toISOString(),
      banReason: reason,
      bannedBy: adminId,
      sessionsInvalidated: sessionResult.count,
      notificationSent
    });
  } catch (err: any) {
    return internalError(err.message);
  }
};
