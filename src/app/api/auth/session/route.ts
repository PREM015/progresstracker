// ===== FILE: src/app/api/auth/session/route.ts =====

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { logger } from "@/lib/logger";
import { authOptions } from "@/lib/auth"; // ✅ Now imports from correct location

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    return NextResponse.json({
      authenticated: !!session,
      user: session?.user ?? null,
    });
  } catch (error) {
    logger.error("Session error:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { authenticated: false, user: null, error: "Session check failed" },
      { status: 500 }
    );
  }
}