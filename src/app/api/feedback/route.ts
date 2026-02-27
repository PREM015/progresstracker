/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";

async function getUserFromSession(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true },
  });

  return user;
}

// GET /api/feedback - List user's feedback (or all if admin)
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Check if user is admin
    const isAdmin = user
      ? (await prisma.user.findUnique({
          where: { id: user.id },
          select: { isAdmin: true },
        }))?.isAdmin
      : false;

    const where = {
      ...(user && !isAdmin && { userId: user.id }),
      ...(type && { type }),
      ...(status && { status }),
    };

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
        },
      }),
      prisma.feedback.count({ where }),
    ]);

    logger.info("Feedback fetched", {
      userId: user?.id,
      isAdmin,
      total,
    });

    return NextResponse.json({
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching feedback", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/feedback - Submit new feedback (public)
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);

    const body = await req.json();
    const { type, title, message, rating, page, userAgent } = body;

    // Validation
    if (!type || !message) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      );
    }

    const validTypes = ["bug", "feature", "improvement", "other"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user?.id,
        type,
        title,
        message,
        rating,
        page,
        userAgent: userAgent || req.headers.get("user-agent"),
        status: "new",
      },
    });

    logger.info("Feedback submitted", {
      userId: user?.id,
      feedbackId: feedback.id,
      type,
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    logger.error("Error submitting feedback", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}