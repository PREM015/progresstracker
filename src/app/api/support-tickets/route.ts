// src/app/api/support-tickets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { TicketStatus, TicketPriority } from "@prisma/client";

async function getUserFromSession(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  return user;
}

function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

// GET /api/support-tickets - List user's tickets (or all if admin)
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      logger.warn("Unauthorized support tickets access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");

    const skip = (page - 1) * limit;

    const where = {
      ...(user.isAdmin ? {} : { userId: user.id }),
      ...(status && { status: status as TicketStatus }),
      ...(priority && { priority: priority as TicketPriority }),
      ...(category && { category }),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
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
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    logger.info("Support tickets fetched", {
      userId: user.id,
      isAdmin: user.isAdmin,
      total,
      page,
    });

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching support tickets", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/support-tickets - Create new support ticket
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      subject,
      description,
      category,
      priority = "MEDIUM",
      metadata,
      attachments = [],
    } = body;

    // Validation
    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: "Subject, description, and category are required" },
        { status: 400 }
      );
    }

    const validCategories = ["bug", "feature", "question", "billing", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    const validPriorities = Object.values(TicketPriority);
    if (!validPriorities.includes(priority as TicketPriority)) {
      return NextResponse.json(
        { error: `Priority must be one of: ${validPriorities.join(", ")}` },
        { status: 400 }
      );
    }

    const ticketNumber = generateTicketNumber();

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        ticketNumber,
        subject,
        description,
        category,
        priority: priority as TicketPriority,
        status: "OPEN",
        metadata,
        attachments,
      },
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
    });

    logger.info("Support ticket created", {
      userId: user.id,
      ticketId: ticket.id,
      ticketNumber,
      category,
      priority,
    });

    // TODO: Send email notification to support team

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    logger.error("Error creating support ticket", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}