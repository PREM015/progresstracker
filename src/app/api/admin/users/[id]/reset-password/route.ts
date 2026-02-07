
import { NextRequest } from "next/server";
import { success, notFound, validationError, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import SessionService from "@/services/sessionService";
import { sendEmail, emailTemplates } from "@/lib/email";
import { AuditAction } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => { // Updated
  try {
    const authRes = await adminAuth(req);
    if (authRes) return authRes;

    const { id } = params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const adminId = token?.sub;

    const body = await req.json();
    const { sendEmail: toSend = true, generateTempPassword = false } = body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User");
    if (!user.email) return validationError("User has no email"); // Fixed

    // Invalidate sessions first
    await SessionService.revokeAllSessions(id, "admin_password_reset");
    await SessionService.revokeAllRefreshTokens(id, "admin_password_reset");

    const responseData: any = { userId: id, emailSent: false };

    if (generateTempPassword) {
      // Option B: Temp Password
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword }
      });

      responseData.method = "temp_password";
      responseData.tempPassword = tempPassword;

      // Sending email with temp password is risky, usually displayed to admin to copy-paste
      // If toSend is true, maybe send a notification that "Your password has been reset by admin"
      if (toSend) {
        try {
          await sendEmail({
            to: user.email,
            subject: "Password Reset",
            html: `<p>Your password has been reset by an administrator.</p><p>Temporary Password: <strong>${tempPassword}</strong></p><p>Please login and change it immediately.</p>`
          });
          responseData.emailSent = true;
        } catch (e) { console.error("Email failed", e); }
      }

    } else {
      // Option A: Reset Token (Link)
      const buffer = crypto.randomBytes(32);
      const resetToken = buffer.toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

      try {
        await prisma.passwordReset.create({
          data: {
            userId: id,
            token: hashedToken,
            expiresAt
          }
        });
      } catch (e) {
        return internalError("Password reset infrastructure error (DB)");
      }

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${resetToken}`;

      responseData.method = "email";

      if (toSend) {
        try {
          const tmpl = emailTemplates.passwordReset(user.name || user.username || "User", resetUrl);
          await sendEmail({
            to: user.email,
            subject: tmpl.subject,
            html: tmpl.html
          });
          responseData.emailSent = true;
        } catch (e) { console.error("Email failed", e); }
      } else {
        responseData.resetUrl = resetUrl;
      }

      responseData.expiresAt = expiresAt.toISOString();
    }

    // Log
    if (adminId) {
      await auditLogService.create({
        userId: adminId,
        action: "PASSWORD_RESET" as AuditAction,
        category: "security",
        description: "Admin triggered password reset",
        changes: { method: responseData.method } as any,
        entityId: id,
        entityType: "user"
      });
    }

    return success(responseData);
  } catch (err) {
    return internalError((err as Error).message);
  }
};
