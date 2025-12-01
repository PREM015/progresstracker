import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all platforms
    const platforms = await prisma.platform.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      platforms,
    });
  } catch (error: any) {
    console.error("Failed to fetch platforms:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}