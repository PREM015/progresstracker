
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, validationError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import { sendEmail } from "@/lib/email";
import { AuditAction } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const skip = (page - 1) * limit;
  const where: any = {};

  if (status && status !== 'all') where.status = status; // waiting, invited, joined
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } }
    ];
  }

  const [total, entries] = await Promise.all([
    prisma.waitlist.count({ where }),
    prisma.waitlist.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
      // Ideally orderBy position if it exists, but notes say "sortBy position puts null positions last"
      // Prisma doesn't easily support NULLS LAST in basic API, sticking to createdAt for simplicity or simple position asc
    })
  ]);

  // Aggregate stats
  const stats = await prisma.waitlist.groupBy({
    by: ['status'],
    _count: true
  });

  const statMap: any = {};
  stats.forEach(s => statMap[s.status] = s._count);

  const waiting = statMap['waiting'] || 0;
  const invited = statMap['invited'] || 0;
  const joined = statMap['joined'] || 0;
  const conversionRate = invited > 0 ? (joined / invited) * 100 : 0;

  return success({
    entries,
    pagination: {
      page, limit, total, totalPages: Math.ceil(total / limit)
    },
    stats: {
      total: waiting + invited + joined,
      waiting,
      invited,
      joined,
      conversionRate
    }
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const { ids, count, all } = body;

  let entriesToInvite: any[] = [];

  if (ids && Array.isArray(ids) && ids.length > 0) {
    entriesToInvite = await prisma.waitlist.findMany({
      where: { id: { in: ids }, status: 'waiting' }
    });
  } else if (count && count > 0) {
    entriesToInvite = await prisma.waitlist.findMany({
      where: { status: 'waiting' },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      take: count
    });
  } else if (all) {
    entriesToInvite = await prisma.waitlist.findMany({
      where: { status: 'waiting' }
    });
  } else {
    return validationError("Must specify ids, count, or all");
  }

  if (entriesToInvite.length === 0) {
    return success({ invitedCount: 0, message: "No waiting entries found to invite" });
  }

  const invitedEntries: any[] = [];
  const emailsSent = 0;

  // Process Invites (Parallel)
  await Promise.all(entriesToInvite.map(async (entry) => {
    const inviteCode = crypto.randomBytes(16).toString('hex');

    // Update DB
    await prisma.waitlist.update({
      where: { id: entry.id },
      data: {
        status: 'invited',
        invitedAt: new Date(),
        inviteCode
      }
    });

    // Send Email
    try {
      await sendEmail({
        to: entry.email,
        subject: "You're invited! 🎉",
        html: `<p>You've been invited to join CodeSync Pro.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/signup?code=${inviteCode}">Click here to sign up</a></p>`
      });
      invitedEntries.push({ id: entry.id, email: entry.email, inviteCode });
    } catch (e) { console.error(`Failed to email ${entry.email}`, e); }
  }));

  if (adminId) {
    await auditLogService.create({
      userId: adminId,
      action: "ADMIN_ACTION" as AuditAction,
      category: "waitlist",
      description: `Invited ${entriesToInvite.length} users from waitlist`
    });
  }

  return success({
    invitedCount: entriesToInvite.length,
    invitedEntries,
    emailsSent: invitedEntries.length
  });
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return validationError("ids array required");
  }

  const result = await prisma.waitlist.deleteMany({
    where: { id: { in: ids } }
  });

  if (adminId) {
    await auditLogService.create({
      userId: adminId,
      action: "ADMIN_ACTION" as AuditAction,
      category: "waitlist",
      description: `Deleted ${result.count} waitlist entries`
    });
  }

  return success({ deleted: result.count });
});