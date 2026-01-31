// src/app/api/newsletter/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/newsletter/[id] - Get subscriber by ID (admin use)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Note: This endpoint should be admin-protected in production
    // For now, it's public for demonstration

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id: params.id },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(subscriber);
  } catch (error) {
    logger.error("Error fetching subscriber", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/newsletter/[id] - Update subscriber (admin use)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, topics, frequency, isActive } = body;

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id: params.id },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.newsletterSubscriber.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(topics !== undefined && { topics }),
        ...(frequency !== undefined && { frequency }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    logger.info("Newsletter subscriber updated", {
      id: params.id,
      email: subscriber.email,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating subscriber", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/newsletter/[id] - Delete subscriber (admin use)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id: params.id },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    await prisma.newsletterSubscriber.delete({
      where: { id: params.id },
    });

    logger.info("Newsletter subscriber deleted", {
      id: params.id,
      email: subscriber.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting subscriber", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}