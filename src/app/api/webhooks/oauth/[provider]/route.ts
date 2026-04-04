import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Handle OAuth provider webhooks (GitHub OAuth, Google OAuth, etc.)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
): Promise<NextResponse> {
  const { provider } = await params;
  const requestId = `oauth-${provider}-${Date.now()}`;

  try {
    const body = await request.json();

    logger.info('OAuth webhook received', {
      requestId,
      provider,
      userId: (body as any).userId,
    });

    // Process OAuth webhook event
    if ((body as any).event === 'disconnected') {
      await prisma.account.deleteMany({
        where: {
          provider,
          providerAccountId: (body as any).accountId,
        },
      });
      logger.info('OAuth account disconnected', { requestId, provider });
    }

    return NextResponse.json({ success: true, id: requestId });
  } catch (error) {
    logger.error('OAuth webhook error', { requestId, provider, error: String(error) });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'OAuth webhook endpoint active' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
