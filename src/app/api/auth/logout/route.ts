// src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const CONSTANT_TIME_MS = 250;

async function constantTimeDelay(start: number) {
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, CONSTANT_TIME_MS - elapsed);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

function secureResponse(body: object, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  return res;
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const clientIP = getClientIP(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse({ success: false, message: "Not authenticated" }, 401);
    }

    logger.info('User logout', { userId: session.user.id, ip: clientIP });

    // Get current session token
    const currentSessionToken = 
      req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;

    // Invalidate current active session
    if (currentSessionToken) {
      await prisma.activeSession.updateMany({
        where: {
          userId: session.user.id,
          token: currentSessionToken,
        },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'user_logout',
        },
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LOGOUT',
        category: 'auth',
        description: 'User logged out',
        ipAddress: clientIP,
        userAgent: req.headers.get('user-agent')?.slice(0, 255),
        status: 'success',
      },
    });

    await constantTimeDelay(start);
    return secureResponse({ success: true, message: "Logged out successfully" }, 200);

  } catch (error) {
    logger.error("Logout error", { ip: clientIP }, error);
    await constantTimeDelay(start);
    return secureResponse({ success: false, message: "Logout failed" }, 500);
  }
}

export async function GET() { return secureResponse({ error: "Method not allowed" }, 405); }
export async function PUT() { return secureResponse({ error: "Method not allowed" }, 405); }
export async function DELETE() { return secureResponse({ error: "Method not allowed" }, 405); }