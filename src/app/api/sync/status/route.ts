import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SyncService } from "@/services/syncService";
import { syncOrchestrator } from "@/services/sync/syncOrchestrator";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // ✅ CORRECT way in App Router
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { status: "unauthenticated", lastSync: null },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    // ✅ Safe job status lookup
    if (jobId) {
      const job = syncOrchestrator?.getJobStatus(jobId) ?? null;

      return NextResponse.json(
        { job },
        { status: 200 }
      );
    }

    // ✅ Safe sync state (never throw)
    let syncState;
    try {
      syncState = await SyncService.getSyncStatus(session.user.id);
    } catch {
      syncState = {
        status: "idle",
        lastSync: null,
      };
    }

    const queueStatus = syncOrchestrator?.getQueueStatus?.() ?? {
      active: 0,
      pending: 0,
    };

    return NextResponse.json(
      {
        ...syncState,
        queue: queueStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sync status error:", error);

    // 🔥 NEVER fail fetch
    return NextResponse.json(
      {
        status: "idle",
        lastSync: null,
        error: "sync-status-fallback",
      },
      { status: 200 }
    );
  }
}
