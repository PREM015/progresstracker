// src/app/api/newsletter/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Generate unsubscribe token
function generateUnsubscribeToken(email: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email}-${process.env.NEWSLETTER_SECRET || "secret"}`)
    .digest("hex");
}

// Verify unsubscribe token
function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

// GET /api/newsletter/unsubscribe - Unsubscribe via link
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

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!subscriber) {
      return NextResponse.json({
        success: true,
        message: "You have been unsubscribed from the newsletter.",
      });
    }

    await prisma.newsletterSubscriber.update({
      where: { email: email.toLowerCase().trim() },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: "User clicked unsubscribe link",
      },
    });

    logger.info("Newsletter unsubscribe", {
      email: subscriber.email,
    });

    return NextResponse.json({
      success: true,
      message: "You have been successfully unsubscribed from the newsletter.",
    });
  } catch (error) {
    logger.error("Error unsubscribing from newsletter", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/newsletter/unsubscribe - Unsubscribe via email submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, reason } = body;

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

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: "If the email exists in our newsletter, it has been unsubscribed.",
    };

    if (!subscriber) {
      return NextResponse.json(successResponse);
    }

    await prisma.newsletterSubscriber.update({
      where: { email: email.toLowerCase().trim() },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason || "User request",
      },
    });

    logger.info("Newsletter unsubscribe via POST", {
      email: subscriber.email,
      reason,
    });

    // TODO: Send confirmation email
    // await sendUnsubscribeConfirmationEmail(subscriber.email);

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error("Error processing unsubscribe request", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}