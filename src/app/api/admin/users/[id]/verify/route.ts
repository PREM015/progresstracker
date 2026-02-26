
import { NextRequest } from "next/server";
import { success, notFound, validationError, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
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
    const { verifyEmail = true, verifyAccount = true } = body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return notFound("User");

    const updateData: any = {};
    if (verifyAccount && !user.isVerified) updateData.isVerified = true;
    if (verifyEmail && !user.emailVerified) updateData.emailVerified = new Date();

    if (Object.keys(updateData).length === 0) {
      return validationError("User is already verified");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Cleanup pending verifications
    if (verifyEmail) {
      try {
        await prisma.emailVerification.deleteMany({
          where: { userId: id, verifiedAt: null }
        });
      } catch (e) { /* ignore */ }
    }

    if (adminId) {
      await auditLogService.create({
        userId: adminId,
        action: "ADMIN_ACTION" as AuditAction,
        category: "user_verify",
        description: "User manually verified by admin",
        changes: updateData,
        entityId: id,
        entityType: "user"
      });
    }

    return success({
      userId: id,
      isVerified: updated.isVerified,
      emailVerified: updated.emailVerified,
      verifiedBy: adminId,
      verifiedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return internalError(err.message);
  }
};
