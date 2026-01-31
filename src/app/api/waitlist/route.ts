// src/app/api/waitlist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/waitlist - Check waitlist status by email
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const entry = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        email: true,
        name: true,
        status: true,
        position: true,
        createdAt: true,
        invitedAt: true,
        joinedAt: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Email not found in waitlist" },
        { status: 404 }
      );
    }

    // Get stats
    const [totalWaiting, totalInvited, totalJoined, aheadOfYou] = await Promise.all([
      prisma.waitlist.count({
        where: { status: "waiting" },
      }),
      prisma.waitlist.count({
        where: { status: "invited" },
      }),
      prisma.waitlist.count({
        where: { status: "joined" },
      }),
      prisma.waitlist.count({
        where: {
          status: "waiting",
          position: { lt: entry.position || 0 },
        },
      }),
    ]);

    logger.info("Waitlist status checked", {
      email: entry.email,
      position: entry.position,
    });

    return NextResponse.json({
      ...entry,
      stats: {
        totalWaiting,
        totalInvited,
        totalJoined,
        aheadOfYou,
      },
    });
  } catch (error) {
    logger.error("Error checking waitlist status", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/waitlist - Remove from waitlist
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token"); // Optional unsubscribe token

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const entry = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!entry) {
      // Don't reveal if email exists
      return NextResponse.json({
        success: true,
        message: "If the email exists, it has been removed from the waitlist.",
      });
    }

    // Verify token if provided (for unsubscribe links)
    // For now, we'll allow deletion without token from this endpoint
    // In production, you should require token verification

    await prisma.waitlist.delete({
      where: { email: email.toLowerCase().trim() },
    });

    logger.info("Waitlist entry removed", {
      email: entry.email,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully removed from the waitlist.",
    });
  } catch (error) {
    logger.error("Error removing from waitlist", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/waitlist - Update waitlist entry (for user to update their info)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const entry = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Email not found in waitlist" },
        { status: 404 }
      );
    }

    // Only allow updating if status is still "waiting"
    if (entry.status !== "waiting") {
      return NextResponse.json(
        { error: "Cannot update entry after invitation" },
        { status: 400 }
      );
    }

    const updated = await prisma.waitlist.update({
      where: { email: email.toLowerCase().trim() },
      data: {
        ...(name !== undefined && { name: name?.trim() }),
      },
      select: {
        email: true,
        name: true,
        status: true,
        position: true,
        createdAt: true,
      },
    });

    logger.info("Waitlist entry updated", {
      email: updated.email,
    });

    return NextResponse.json({
      success: true,
      entry: updated,
    });
  } catch (error) {
    logger.error("Error updating waitlist entry", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}