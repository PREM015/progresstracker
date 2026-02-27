
import { NextRequest } from "next/server";
import { success, notFound, forbidden, validationError, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import SessionService from "@/services/sessionService";
import { signJwt } from "@/lib/jwt";
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
    const { reason } = body;

    if (!reason) return validationError("Reason required");

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return notFound("User");
    if (targetUser.role === 'admin' || targetUser.isAdmin) return forbidden("Cannot impersonate admin");
    if (targetUser.isBanned) return forbidden("Cannot impersonate banned user");

    // Create Impersonation Token
    // 1. JWT: Signed with our secret, containing impersonation flag
    const impersonationPayload: any = {
      userId: targetUser.id,
      role: targetUser.role, // "user"
      email: targetUser.email,
      impersonating: true,
      adminUserId: adminId,
      issuedAt: Date.now()
    };

    const jwtToken = signJwt(impersonationPayload);

    // 2. Active Session Record
    // We'll create a session in DB to track it, but the JWT is what allows API access if using JWT auth
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() || "127.0.0.1";

    const sessionInfo = await SessionService.createSession(targetUser.id, {
      userAgent: req.headers.get("user-agent") || "Admin Impersonation",
      ipAddress: ip
    });

    // Log
    if (adminId) {
      await auditLogService.create({
        userId: adminId,
        action: "ADMIN_ACTION" as AuditAction,
        category: "security",
        description: `Started impersonating ${targetUser.username}`,
        changes: { reason, targetUserId: id } as any,
        entityId: id,
        entityType: "user"
      });
    }

    return success({
      impersonationToken: jwtToken,
      sessionId: sessionInfo.id,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        username: targetUser.username
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      restrictions: ["delete_account", "change_password", "billing_update"]
    });
  } catch (err: any) {
    return internalError(err.message);
  }
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => { // Updated
  try {
    // End session (revoke)
    const authRes = await adminAuth(req);
    if (authRes) return authRes;

    // We can revoke by sessionId passed in body or just log the end
    // Logic depends on how client handles "end impersonation" (usually clearing token)

    return success({ message: "Impersonation session ended" });
  } catch (err: any) {
    return internalError(err.message);
  }
};
