// src/app/api/waitlist/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Generate unsubscribe token (you should call this when adding to waitlist)
function generateUnsubscribeToken(email: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email}-${process.env.WAITLIST_SECRET || "secret"}`)
    .digest("hex");
}

// Verify unsubscribe token
function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

// GET /api/waitlist/unsubscribe - Unsubscribe from waitlist with token
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 }
      );
    }

    // Verify token
    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token" },
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
        message: "You have been unsubscribed from the waitlist.",
      });
    }

    await prisma.waitlist.delete({
      where: { email: email.toLowerCase().trim() },
    });

    logger.info("Waitlist unsubscribe", {
      email: entry.email,
    });

    return NextResponse.json({
      success: true,
      message: "You have been successfully unsubscribed from the waitlist.",
    });
  } catch (error) {
    logger.error("Error unsubscribing from waitlist", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/waitlist/unsubscribe - Unsubscribe via email submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

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

    const entry = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: "If the email exists in our waitlist, it has been removed.",
    };

    if (!entry) {
      return NextResponse.json(successResponse);
    }

    await prisma.waitlist.delete({
      where: { email: email.toLowerCase().trim() },
    });

    logger.info("Waitlist unsubscribe via POST", {
      email: entry.email,
    });

    try {
      const { sendEmail } = await import('@/lib/email');
      await sendEmail({
        to: email,
        subject: 'Unsubscribed from Waitlist',
        html: '<p>You have been unsubscribed from our waitlist.</p>',
      });
    } catch (emailErr) {
      logger.warn('Failed to send unsubscribe confirmation', { email, error: String(emailErr) });
    }

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error("Error processing unsubscribe request", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}