import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

// This is an SSE endpoint
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = `sse_${Date.now()}`;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    // Rate limit for connections? One per user per 10s?
    // SSE connections can be long-lived, so rate limiting connection attempts is fine.

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`));

        // Setup heartbeat interval
        const interval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch (e) {
            clearInterval(interval);
            controller.close();
          }
        }, 30000); // 30s heartbeat

        // Clean up on close (though Next.js might not trigger this reliably in all envs)
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
          logger.info('SSE connection closed', { userId: session.user.id });
        });
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    logger.error('SSE connection failed', { requestId }, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
