import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/sync
 * Check sync status
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      status: "idle",
      message: "Sync service is available",
    });
  } catch (error) {
    console.error("Failed to fetch sync status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sync
 * Trigger sync process
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // 🔒 Example validation
    if (!body?.type) {
      return NextResponse.json(
        { success: false, message: "Sync type is required" },
        { status: 400 }
      );
    }

    // 🔁 SYNC LOGIC GOES HERE
    // e.g. sync users, stats, platforms, etc.
    // await syncUsers();
    // await syncStats();

    return NextResponse.json({
      success: true,
      message: `Sync started for ${body.type}`,
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { success: false, message: "Sync failed" },
      { status: 500 }
    );
  }
}
