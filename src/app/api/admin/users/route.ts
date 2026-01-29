import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users
 * Fetch all users
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("ADMIN USERS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password required" },
        { status: 400 }
      );
    }

    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      return NextResponse.json(
        { success: false, message: "User already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // ⚠️ hash if not already handled in auth layer
        role: role ?? "USER",
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("ADMIN USERS POST ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create user" },
      { status: 500 }
    );
  }
}
