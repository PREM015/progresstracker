// src/app/api/newsletter/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";
import crypto from "crypto";

/**
 * API Route: /api/newsletter/subscribe
 * 
 * @description Subscribe to newsletter (public endpoint - no auth required)
 * @created 2026-01-26
 * @updated 2026-01-27
 */

// Generate unsubscribe token
function generateUnsubscribeToken(email: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email}-${process.env.NEWSLETTER_SECRET || "secret"}`)
    .digest("hex");
}

// GET - Check subscription status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        email: true,
        name: true,
        topics: true,
        frequency: true,
        isActive: true,
        confirmedAt: true,
        createdAt: true,
      },
    });

    if (!subscriber) {
      return NextResponse.json({
        subscribed: false,
        message: "Email is not subscribed to the newsletter",
      });
    }

    logger.info("Newsletter subscription status checked", {
      email: subscriber.email,
      isActive: subscriber.isActive,
    });

    return NextResponse.json({
      subscribed: true,
      isActive: subscriber.isActive,
      data: subscriber,
    });
  } catch (error) {
    logger.error("Error checking newsletter subscription status", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Subscribe to newsletter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, topics = [], frequency = "weekly" } = body;

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

    // Validate frequency
    const validFrequencies = ["weekly", "monthly"];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: "Frequency must be 'weekly' or 'monthly'" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // If previously unsubscribed, reactivate
      if (!existing.isActive) {
        const reactivated = await prisma.newsletterSubscriber.update({
          where: { email: normalizedEmail },
          data: {
            isActive: true,
            name: name?.trim() || existing.name,
            topics: topics.length > 0 ? topics : existing.topics,
            frequency,
            confirmedAt: new Date(),
            unsubscribedAt: null,
            unsubscribeReason: null,
          },
        });

        logger.info("Newsletter subscription reactivated", {
          email: reactivated.email,
        });

        return NextResponse.json({
          success: true,
          message: "Successfully resubscribed to the newsletter!",
          data: {
            email: reactivated.email,
            name: reactivated.name,
            topics: reactivated.topics,
            frequency: reactivated.frequency,
          },
        });
      }

      // Already active subscriber
      return NextResponse.json(
        {
          error: "This email is already subscribed to the newsletter",
          data: {
            email: existing.email,
            topics: existing.topics,
            frequency: existing.frequency,
          },
        },
        { status: 409 }
      );
    }

    // Generate unsubscribe token
    const unsubscribeToken = generateUnsubscribeToken(normalizedEmail);

    // Create new subscriber
    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        name: name?.trim(),
        topics,
        frequency,
        isActive: true,
        confirmedAt: new Date(), // Auto-confirm (or set to null for double opt-in)
        unsubscribeToken,
      },
    });

    logger.info("Newsletter subscription created", {
      email: subscriber.email,
      topics: subscriber.topics,
      frequency: subscriber.frequency,
    });

    // TODO: Send welcome email
    // const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(normalizedEmail)}&token=${unsubscribeToken}`;
    // await sendNewsletterWelcomeEmail(normalizedEmail, unsubscribeUrl);

    return NextResponse.json(
      {
        success: true,
        message: "Successfully subscribed to the newsletter!",
        data: {
          email: subscriber.email,
          name: subscriber.name,
          topics: subscriber.topics,
          frequency: subscriber.frequency,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error subscribing to newsletter", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update subscription preferences
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!subscriber.isActive) {
      return NextResponse.json(
        { error: "Subscription is inactive. Please resubscribe." },
        { status: 400 }
      );
    }

    // Validate frequency if provided
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
    });

    logger.info("Newsletter subscription updated", {
      email: updated.email,
      changes: Object.keys(body).filter((key) => key !== "email"),
    });

    return NextResponse.json({
      success: true,
      message: "Subscription preferences updated successfully!",
      data: {
        email: updated.email,
        name: updated.name,
        topics: updated.topics,
        frequency: updated.frequency,
      },
    });
  } catch (error) {
    logger.error("Error updating newsletter subscription", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe from newsletter
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const reason = searchParams.get("reason");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
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
        unsubscribeReason: reason || "User request via API",
      },
    });

    logger.info("Newsletter unsubscribed via DELETE", {
      email: subscriber.email,
      reason,
    });

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error("Error unsubscribing from newsletter", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}