
import { NextRequest } from "next/server";
import { success, notFound, validationError, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
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
    const { reason, notifyUser = true } = body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User");
    if (!user.isBanned) return validationError("User is not banned");

    const previousBanReason = user.banReason;
    const previousBannedAt = (user as any).bannedAt; // Cast if type incomplete

    await prisma.user.update({
      where: { id },
      data: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
        bannedBy: null
      }
    });

    if (notifyUser && user.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Account Reinstated",
          html: `<p>Your account has been reinstated. You can now log in again.</p>`
        });
      } catch (e) { console.error("Unban email failed", e); }
    }

    if (adminId) {
      await auditLogService.create({
        userId: adminId,
        action: "ADMIN_ACTION" as AuditAction,
        category: "user_ban",
        description: `User unbanned: ${user.username}`,
        changes: { unbanReason: reason, previousBanReason } as any,
        entityId: id,
        entityType: "user"
      });
    }

    return success({
      userId: id,
      isBanned: false,
      unbannedAt: new Date().toISOString(),
      unbannedBy: adminId
    });
  } catch (err: any) {
    return internalError(err.message);
  }
};
