
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, validationError, forbidden, notFound } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import { AuditAction, Role } from "@prisma/client"; // Role enum: USER, ADMIN usually
import { getToken } from "next-auth/jwt";
import { ROLES } from "@/config/permissions";

export const GET = withErrorHandling(async (req: NextRequest) => { // Updated
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  // 1. Get counts
  const counts = await prisma.user.groupBy({
    by: ['role'],
    where: { deletedAt: null },
    _count: true
  });

  const countMap: Record<string, number> = {};
  counts.forEach(c => {
    countMap[c.role.toLowerCase()] = c._count;
  });

  // 2. Map definitions
  const roles = Object.entries(ROLES).map(([key, def]) => ({
    role: key,
    description: def.description,
    userCount: countMap[key] || 0,
    permissions: def.permissions
  }));

  return success({
    roles
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => { // Updated
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return validationError("userId and role required");
  }

  // Validate role
  const upperRole = role.toUpperCase();
  if (!['USER', 'ADMIN'].includes(upperRole)) { // Assuming standard prisma enum
    // Or check against ROLES keys
    if (!Object.keys(ROLES).includes(role.toLowerCase())) {
      return validationError("Invalid role");
    }
  }

  // Safety: Cannot demote self
  if (userId === adminId && upperRole !== 'ADMIN') {
    return forbidden("Cannot demote yourself");
  }

  const oldUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!oldUser) return notFound("User not found");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: upperRole as Role }
  });

  if (adminId) {
    await auditLogService.create({
      userId: adminId,
      action: "ADMIN_ACTION" as AuditAction,
      category: "roles", // Fixed category
      description: `Changed user role from ${oldUser.role} to ${upperRole}`,
      entityId: userId,
      entityType: "user",
      changes: { from: oldUser.role, to: upperRole } as any
    });
  }

  return success({
    userId: updated.id,
    role: updated.role,
    previousRole: oldUser.role,
    updatedAt: updated.updatedAt.toISOString()
  });
});
