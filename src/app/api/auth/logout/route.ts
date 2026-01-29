/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const session = await getServerSession({ req, ...authOptions });

    if (!session) {
      await constantTimeDelay(start);
      return secureResponse({ success: false, message: "Not authenticated" }, 401);
    }

    // NextAuth handles session destruction automatically
    // Optional: you can manually delete cookies or revoke tokens here

    await constantTimeDelay(start);
    return secureResponse({ success: true, message: "Logged out successfully" }, 200);
  } catch (error: any) {
    logger.error("Logout error", error);
    await constantTimeDelay(start);
    return secureResponse({ success: false, message: "Logout failed" }, 500);
  }
}

export async function GET() { return secureResponse({ error: "Method not allowed" }, 405); }
export async function PUT() { return secureResponse({ error: "Method not allowed" }, 405); }
export async function DELETE() { return secureResponse({ error: "Method not allowed" }, 405); }
