import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

import { logger } from "@/lib/logger";

// Handle incoming generic webhooks

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const requestId = `incoming-${id}-${Date.now()}`;

  try {
    const body = await request.json();

    logger.info('Incoming webhook received', {
      requestId,
      webhookId: id,
      eventType: (body as any).type,
    });

    // Store incoming webhook event
    await prisma.webhook.create({
      data: {
        platform: 'incoming',
        event: (body as any).type || 'unknown',
        payload: body,
        status: 'PENDING',
      } as any,
    }).catch(() => {
      // If table doesn't exist, just log
      logger.info('Incoming webhook logged', { requestId });
    });

    return NextResponse.json({ success: true, id: requestId });
  } catch (error) {
    logger.error('Incoming webhook error', { requestId, error: String(error) });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Incoming webhook endpoint active' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
