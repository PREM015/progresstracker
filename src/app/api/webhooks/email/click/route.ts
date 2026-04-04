import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

const RATE_LIMIT = 100;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const bodySchema = z.object({
  event: z.enum(['click']),
  email: z.string().email(),
  ts: z.number(),
  messageId: z.string(),
  url: z.string().url().optional(),
  timestamp: z.number().optional(),
});

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

export async function OPTIONS(): Promise<NextResponse> {
  return addHeaders(new NextResponse(null, { status: 204 }), generateRequestId());
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitKey = `email-webhook-click:${ip}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    const body = await request.json();
    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid webhook payload', validation.error.errors, requestId),
        requestId
      );
    }

    const data = validation.data;

    // Record email click in EmailLog
    const emailLog = await prisma.emailLog.updateMany({
      where: { email: data.email, messageId: data.messageId } as any,
      data: { status: 'CLICKED', clickedAt: new Date(data.ts * 1000) },
    });

    const result = { processed: emailLog.count, email: data.email, url: data.url };

    logger.info('Email click webhook processed', {
      requestId,
      email: data.email,
      messageId: data.messageId,
      duration: Date.now() - startTime,
    });

    return addHeaders(apiResponse.success(result, { meta: { requestId } }), requestId);
  } catch (error) {
    logger.error('Email click webhook failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Webhook processing failed', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
