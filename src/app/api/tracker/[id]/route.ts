// src/app/api/tracker/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";import { logger } from '@/lib/logger';import { z } from "zod";

const updateEntrySchema = z.object({
  platform: z.string().optional(),
  problems: z.number().int().min(0).optional(),
  timeSpent: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * ✅ PUT – Update tracker entry
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = updateEntrySchema.parse(body);

    const existing = await prisma.trackerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.trackerEntry.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating tracker entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update entry" },
      { status: 500 }
    );
  }
}

/**
 * ✅ DELETE – Delete tracker entry
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existing = await prisma.trackerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    await prisma.trackerEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting tracker entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete entry" },
      { status: 500 }
    );
  }
}
