import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 20;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// Ticket priority enum
const TicketPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const createTicketSchema = z.object({
  subject: z.string().min(5, 'Subject is too short').max(200),
  description: z.string().min(20, 'Description is too short'),
  category: z.string(),
  priority: TicketPriority.optional().default('MEDIUM'),
  // attachments: z.array(z.string().url()).optional() // Handle attachments separately or allow URLs?
});

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: any): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tickets:list:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: any = {
      userId: session.user.id,
    };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where })
    ]);

    logger.info('GET support tickets list completed', { userId: session.user.id, count: tickets.length, requestId, duration: Date.now() - startTime });

    return addHeaders(
      apiResponse.paginated(
        tickets,
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
        { meta: { requestId } }
      ),
      requestId,
      rateLimitResult
    );

  } catch (error) {
    logger.error('GET support tickets list failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    // Stricter limit for creation
    const rateLimitResult = await checkLimit(apiRateLimiter, 5, `tickets:create:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(300, requestId), requestId, rateLimitResult);
    }

    const body = await request.json();
    const validation = createTicketSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
    }

    const { subject, description, category, priority } = validation.data;

    // Generate ticket number T-{Timestamp}-{Random}
    const ticketNumber = `T-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        ticketNumber,
        subject,
        description,
        category,
        priority,
        status: 'OPEN',
      }
    });

    logger.info('POST create support ticket completed', { userId: session.user.id, ticketId: ticket.id, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.created(ticket, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('POST create support ticket failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}