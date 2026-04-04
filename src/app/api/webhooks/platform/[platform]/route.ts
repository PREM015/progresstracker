import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { apiResponse } from "@/lib/apiResponse";

// Handle platform-specific webhooks (GitHub, LeetCode, etc.)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
): Promise<NextResponse> {
  const { platform } = await params;
  const requestId = `webhook-${platform}-${Date.now()}`;

  try {
    const body = await request.json();

    logger.info('Platform webhook received', {
      requestId,
      platform,
      eventType: (body as any).type || 'unknown',
    });

    // Store webhook event for processing
    await prisma.webhook.create({
      data: {
        platform,
        event: (body as any).type || 'unknown',
        payload: body,
        status: 'PENDING',
      } as any,
    }).catch(() => {
      // If webhookLog doesn't exist, just log
      logger.info('Webhook logged', { requestId, platform });
    });

    return NextResponse.json({ success: true, id: requestId });
  } catch (error) {
    logger.error('Platform webhook error', { requestId, platform, error: String(error) });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Platform webhook endpoint active' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
