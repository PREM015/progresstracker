// src/app/api/support-tickets/[id]/replies/route.ts
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
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  return user;
}

// GET /api/support-tickets/[id]/replies - Get all replies for a ticket
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check authorization
    if (!user.isAdmin && ticket.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const replies = await prisma.ticketReply.findMany({
      where: {
        ticketId: params.id,
        ...(user.isAdmin ? {} : { isInternal: false }), // Hide internal notes from users
      },
      orderBy: { createdAt: "asc" },
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

    return NextResponse.json({ replies });
  } catch (error) {
    logger.error("Error fetching ticket replies", { ticketId: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/support-tickets/[id]/replies - Add reply to ticket
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { message, attachments = [], isInternal = false } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check authorization
    const isOwner = ticket.userId === user.id;
    if (!user.isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Only admins can create internal notes
    if (isInternal && !user.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can create internal notes" },
        { status: 403 }
      );
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: params.id,
        userId: user.id,
        message,
        attachments,
        isStaffReply: user.isAdmin,
        isInternal,
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

    // Update ticket status if needed
    if (ticket.status === "WAITING" && user.isAdmin) {
      await prisma.supportTicket.update({
        where: { id: params.id },
        data: { status: "IN_PROGRESS" },
      });
    } else if (ticket.status === "IN_PROGRESS" && !user.isAdmin) {
      await prisma.supportTicket.update({
        where: { id: params.id },
        data: { status: "WAITING" },
      });
    }

    logger.info("Ticket reply created", {
      userId: user.id,
      isAdmin: user.isAdmin,
      ticketId: params.id,
      replyId: reply.id,
      isInternal,
    });

    // TODO: Send email notification to other party

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    logger.error("Error creating ticket reply", { ticketId: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}