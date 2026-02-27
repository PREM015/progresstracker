// src/app/api/newsletter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/newsletter - Get subscriber info
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

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        email: true,
        name: true,
        topics: true,
        frequency: true,
        isActive: true,
        confirmedAt: true,
        unsubscribedAt: true,
        createdAt: true,
      },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(subscriber);
  } catch (error) {
    logger.error("Error fetching subscriber info", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/newsletter - Update subscriber preferences
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, topics, frequency } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    // Validate frequency
    if (frequency && !["weekly", "monthly"].includes(frequency)) {
      return NextResponse.json(
        { error: "Frequency must be 'weekly' or 'monthly'" },
        { status: 400 }
      );
    }

    const updated = await prisma.newsletterSubscriber.update({
      where: { email: email.toLowerCase().trim() },
      data: {
        ...(name !== undefined && { name: name?.trim() }),
        ...(topics !== undefined && { topics }),
        ...(frequency !== undefined && { frequency }),
      },
      select: {
        email: true,
        name: true,
        topics: true,
        frequency: true,
        isActive: true,
        createdAt: true,
      },
    });

    logger.info("Newsletter preferences updated", {
      email: updated.email,
      changes: Object.keys(body),
    });

    return NextResponse.json({
      success: true,
      subscriber: updated,
    });
  } catch (error) {
    logger.error("Error updating newsletter preferences", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}