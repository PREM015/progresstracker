// src/app/api/waitlist/join/route.ts (ENHANCED VERSION)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Generate unsubscribe token
function generateUnsubscribeToken(email: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email}-${process.env.WAITLIST_SECRET || "secret"}`)
    .digest("hex");
}

// POST /api/waitlist/join - Join waitlist (public)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, source, referralCode } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
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

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "This email is already on the waitlist",
          position: existing.position,
          status: existing.status,
        },
        { status: 409 }
      );
    }

    // Get current position (total count + 1)
    const totalCount = await prisma.waitlist.count();
    const position = totalCount + 1;

    // Create waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        email: normalizedEmail,
        name: name?.trim(),
        source: source || "landing",
        referralCode,
        status: "waiting",
        position,
      },
    });

    // Generate unsubscribe token for email
    const unsubscribeToken = generateUnsubscribeToken(normalizedEmail);

    logger.info("Waitlist entry created", {
      email: waitlistEntry.email,
      position,
      source,
    });

    // TODO: Send welcome email with unsubscribe link
    // const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/waitlist/unsubscribe?email=${encodeURIComponent(normalizedEmail)}&token=${unsubscribeToken}`;
    // await sendWaitlistWelcomeEmail(normalizedEmail, position, unsubscribeUrl);

    return NextResponse.json(
      {
        success: true,
        message: "Successfully joined the waitlist!",
        position,
        email: waitlistEntry.email,
        unsubscribeToken, // Include in response for testing (remove in production)
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error joining waitlist", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/waitlist/join?email=xxx - Check if email is already on waitlist
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

    const entry = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        email: true,
        name: true,
        status: true,
        position: true,
        createdAt: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { exists: false },
        { status: 200 }
      );
    }

    // Get total waitlist count
    const totalCount = await prisma.waitlist.count({
      where: { status: "waiting" },
    });

    return NextResponse.json({
      exists: true,
      ...entry,
      totalWaiting: totalCount,
    });
  } catch (error) {
    logger.error("Error checking waitlist", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}