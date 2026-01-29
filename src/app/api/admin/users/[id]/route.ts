import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: {
    id: string;
  };
};

/**
 * GET /api/admin/users/[id]
 * Fetch single user
 */
export async function GET(_: Request, { params }: Params) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("ADMIN USER GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const { name, role } = body;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("ADMIN USER PATCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update user" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Remove user
 */
export async function DELETE(_: Request, { params }: Params) {
  try {
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("ADMIN USER DELETE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete user" },
      { status: 500 }
    );
  }
}
