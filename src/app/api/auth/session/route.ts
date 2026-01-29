// app/api/auth/session/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

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

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const session = await getServerSession({ req, ...authOptions });

    await constantTimeDelay(start);
    return secureResponse(
      { authenticated: !!session, user: session?.user ?? null },
      200
    );
  } catch (error) {
    logger.error("Session check error", error);
    await constantTimeDelay(start);
    return secureResponse(
      { authenticated: false, user: null, error: "Session check failed" },
      500
    );
  }
}

// Disallow other methods
export async function POST() { return secureResponse({ error: "Method not allowed" }, 405); }
export async function PUT() { return secureResponse({ error: "Method not allowed" }, 405); }
export async function DELETE() { return secureResponse({ error: "Method not allowed" }, 405); }
