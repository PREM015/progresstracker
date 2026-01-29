import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const platforms = await prisma.platform.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: platforms,
    });
  } catch (error) {
    console.error("GET PLATFORMS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch platforms" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Platform name is required" },
        { status: 400 }
      );
    }

    const platform = await prisma.platform.create({
      data: {
        name,
        description,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: platform,
    });
  } catch (error) {
    console.error("CREATE PLATFORM ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create platform" },
      { status: 500 }
    );
  }
}
