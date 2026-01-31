// src/app/api/support-tickets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { TicketStatus } from "@prisma/client";

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

// GET /api/support-tickets/[id] - Get single ticket with replies
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
        replies: {
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
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check authorization (user can view own tickets, admin can view all)
    if (!user.isAdmin && ticket.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error) {
    logger.error("Error fetching support ticket", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/support-tickets/[id] - Update ticket (admin only for most fields)
export async function PATCH(
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
    const { status, priority, assignedTo, resolution, satisfactionRating, feedbackComment } = body;

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
    const canUpdate = user.isAdmin || isOwner;

    if (!canUpdate) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Users can only update satisfaction rating and feedback
    if (!user.isAdmin && (status || priority || assignedTo || resolution)) {
      return NextResponse.json(
        { error: "Only admins can update status, priority, assignment, or resolution" },
        { status: 403 }
      );
    }

    // Validate status if provided
    if (status) {
      const validStatuses = Object.values(TicketStatus);
      if (!validStatuses.includes(status as TicketStatus)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Auto-set resolvedAt when resolving
    const shouldSetResolvedAt =
      status === "RESOLVED" &&
      ticket.status !== "RESOLVED" &&
      !ticket.resolvedAt;

    const updated = await prisma.supportTicket.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status: status as TicketStatus }),
        ...(priority !== undefined && { priority }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(resolution !== undefined && { resolution }),
        ...(satisfactionRating !== undefined && { satisfactionRating }),
        ...(feedbackComment !== undefined && { feedbackComment }),
        ...(shouldSetResolvedAt && { resolvedAt: new Date() }),
      },
    });

    logger.info("Support ticket updated", {
      userId: user.id,
      isAdmin: user.isAdmin,
      ticketId: params.id,
      changes: Object.keys(body),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating support ticket", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/support-tickets/[id] - Delete ticket (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(req);
    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
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

    // Delete ticket and all replies (cascade)
    await prisma.supportTicket.delete({
      where: { id: params.id },
    });

    logger.info("Support ticket deleted", {
      adminId: user.id,
      ticketId: params.id,
      ticketNumber: ticket.ticketNumber,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting support ticket", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}