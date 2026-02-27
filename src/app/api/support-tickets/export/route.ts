// src/app/api/support-tickets/export/route.ts
// =============================================================================
// TICKET EXPORT API
// Methods: GET, POST, OPTIONS
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { TicketStatus, TicketPriority, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 5; // Stricter limit for exports

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

// =============================================================================
// VALIDATION
// =============================================================================

const exportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  status: z.array(z.nativeEnum(TicketStatus)).optional(),
  priority: z.array(z.nativeEnum(TicketPriority)).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeReplies: z.boolean().default(false),
  includeMetadata: z.boolean().default(false),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function ticketsToCSV(tickets: any[], includeReplies: boolean): string {
  const headers = [
    'Ticket Number',
    'Subject',
    'Status',
    'Priority',
    'Category',
    'Created At',
    'Updated At',
    'Resolved At',
    'User Name',
    'User Email',
    'Assigned To',
    'Rating',
    'Reply Count',
  ];

  if (includeReplies) {
    headers.push('Replies');
  }

  const rows = tickets.map((ticket) => {
    const row = [
      escapeCSV(ticket.ticketNumber),
      escapeCSV(ticket.subject),
      escapeCSV(ticket.status),
      escapeCSV(ticket.priority),
      escapeCSV(ticket.category),
      escapeCSV(ticket.createdAt),
      escapeCSV(ticket.updatedAt),
      escapeCSV(ticket.resolvedAt),
      escapeCSV(ticket.user?.name),
      escapeCSV(ticket.user?.email),
      escapeCSV(ticket.assignedTo),
      escapeCSV(ticket.satisfactionRating),
      escapeCSV(ticket._count?.replies || 0),
    ];

    if (includeReplies && ticket.replies) {
      const repliesText = ticket.replies
        .map((r: any) => `[${r.createdAt}] ${r.user?.name || 'System'}: ${r.message}`)
        .join(' | ');
      row.push(escapeCSV(repliesText));
    }

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// =============================================================================
// GET - Export with Query Params
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-export:${ip}`);

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(300, requestId);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const userId = session.user.id;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    // Parse query params
    const { searchParams } = new URL(request.url);

    const exportData = {
      format: searchParams.get('format') || 'csv',
      status: searchParams.getAll('status').length > 0 ? searchParams.getAll('status') : undefined,
      priority: searchParams.getAll('priority').length > 0 ? searchParams.getAll('priority') : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      includeReplies: searchParams.get('includeReplies') === 'true',
      includeMetadata: searchParams.get('includeMetadata') === 'true',
    };

    return executeExport(exportData, userId, isAdmin, requestId, startTime);
  } catch (error) {
    logger.error('GET export failed', { requestId }, error);
    return apiResponse.internalError('Export failed', requestId);
  }
}

// =============================================================================
// POST - Export with Body
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `ticket-export:${ip}`);

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(300, requestId);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const userId = session.user.id;
    const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiResponse.validationError('Invalid JSON body', undefined, requestId);
    }

    return executeExport(body, userId, isAdmin, requestId, startTime);
  } catch (error) {
    logger.error('POST export failed', { requestId }, error);
    return apiResponse.internalError('Export failed', requestId);
  }
}

// =============================================================================
// EXPORT EXECUTOR
// =============================================================================

async function executeExport(
  exportData: unknown,
  userId: string,
  isAdmin: boolean,
  requestId: string,
  startTime: number
): Promise<NextResponse> {
  const validation = exportSchema.safeParse(exportData);

  if (!validation.success) {
    return apiResponse.validationError('Invalid export parameters', validation.error.errors, requestId);
  }

  const { format, status, priority, dateFrom, dateTo, includeReplies, includeMetadata } = validation.data;

  // Build where clause
  const where: Prisma.SupportTicketWhereInput = isAdmin ? {} : { userId };

  if (status && status.length > 0) {
    where.status = { in: status };
  }

  if (priority && priority.length > 0) {
    where.priority = { in: priority };
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  // Fetch tickets
  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 1000, // Limit export size
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      replies: includeReplies
        ? {
            orderBy: { createdAt: 'asc' },
            where: isAdmin ? {} : { isInternal: false },
            include: {
              user: { select: { name: true } },
            },
          }
        : false,
      _count: { select: { replies: true } },
    },
  });

  logger.info('Export executed', {
    userId,
    isAdmin,
    format,
    ticketCount: tickets.length,
    requestId,
    duration: Date.now() - startTime,
  });

  // Generate export
  if (format === 'json') {
    const jsonData = includeMetadata
      ? {
          exportedAt: new Date().toISOString(),
          exportedBy: userId,
          ticketCount: tickets.length,
          filters: { status, priority, dateFrom, dateTo },
          tickets,
        }
      : tickets;

    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tickets-export-${Date.now()}.json"`,
        'X-Request-ID': requestId,
      },
    });
  }

  // CSV format
  const csv = ticketsToCSV(tickets, includeReplies);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tickets-export-${Date.now()}.csv"`,
      'X-Request-ID': requestId,
    },
  });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';