import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // NextAuth handles session destruction automatically
    // This endpoint is for custom logout logic if needed

    return NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Logout failed", error: error.message },
      { status: 500 }
    );
  }
}