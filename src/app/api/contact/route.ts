// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import apiResponse from '@/lib/apiResponse';
import { createRateLimiter } from '@/lib/rateLimit';
import { supportService } from '@/services/supportService';
import { emailService } from '@/lib/email';
import { render } from '@react-email/render';
import SupportTicketCreatedEmail from '@/emails/support-ticket-created';
import { TicketPriority, TicketStatus } from '@prisma/client';

// =============================================================================
// RATE LIMITERS
// =============================================================================

// Strict rate limiting for unauthenticated users (prevent spam)
const guestContactLimiter = createRateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 100,
});

// More lenient for authenticated users
const userContactLimiter = createRateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const contactSchema = z.object({
  // Basic fields
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject too long')
    .trim(),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message too long')
    .trim(),

  // Categorization
  category: z
    .enum(['bug', 'feature', 'question', 'billing', 'account', 'other'])
    .default('other'),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .optional(),

  // Optional metadata
  metadata: z
    .object({
      browser: z.string().optional(),
      os: z.string().optional(),
      page: z.string().optional(),
      userAgent: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),

  // Spam protection (honeypot)
  website: z.string().max(0).optional(), // Should be empty
  phone: z.string().max(0).optional(), // Should be empty
});

const querySchema = z.object({
  page: z
    .string()
    .transform((v) => Math.max(1, parseInt(v) || 1))
    .optional(),
  limit: z
    .string()
    .transform((v) => Math.min(50, Math.max(1, parseInt(v) || 20)))
    .optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']).optional(),
  category: z.string().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Detect priority based on message content
 */
function detectPriority(subject: string, message: string): TicketPriority {
  const content = `${subject} ${message}`.toLowerCase();

  // Critical keywords
  if (
    /urgent|critical|emergency|asap|down|not working|broken|crash|error|bug/i.test(
      content
    )
  ) {
    return 'CRITICAL';
  }

  // High priority keywords
  if (/important|high priority|issue|problem/i.test(content)) {
    return 'HIGH';
  }

  // Low priority keywords
  if (/question|wondering|curious|suggestion/i.test(content)) {
    return 'LOW';
  }

  return 'MEDIUM';
}

/**
 * Calculate expected response time based on priority
 */
function getExpectedResponseTime(priority: TicketPriority): string {
  switch (priority) {
    case 'CRITICAL':
      return '2 hours';
    case 'HIGH':
      return '6 hours';
    case 'MEDIUM':
      return '24 hours';
    case 'LOW':
      return '48 hours';
    default:
      return '24 hours';
  }
}

/**
 * Check for spam patterns
 */
function isSpam(data: {
  name: string;
  email: string;
  message: string;
  website?: string;
  phone?: string;
}): boolean {
  // Honeypot check
  if (data.website || data.phone) {
    return true;
  }

  // Check for common spam patterns
  const spamPatterns = [
    /viagra|cialis|pharmacy/i,
    /casino|poker|gambling/i,
    /bitcoin|cryptocurrency|investment/i,
    /click here|buy now/i,
    /(https?:\/\/.*){5,}/i, // Too many URLs
  ];

  const content = `${data.name} ${data.email} ${data.message}`;
  return spamPatterns.some((pattern) => pattern.test(content));
}

// =============================================================================
// POST - Submit Contact Form / Create Support Ticket
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Get session (optional - works for both authenticated and guest users)
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user?.id;

    // ✅ Rate Limiting (stricter for guests)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = isAuthenticated ? session.user.id : ip;
    const limiter = isAuthenticated ? userContactLimiter : guestContactLimiter;
    const limit = isAuthenticated ? 10 : 3;

    const rateLimitResult = await limiter.check(limit, rateLimitKey);

    if (!rateLimitResult.success) {
      logger.warn('Contact form rate limit exceeded', {
        ip,
        isAuthenticated,
        requestId,
      });
      return apiResponse.rateLimited(
        isAuthenticated ? 60 : 3600, // 1 min vs 1 hour
        requestId
      );
    }

    // ✅ Parse and Validate Request Body
    const body = await req.json();
    const validated = contactSchema.parse(body);

    // ✅ Spam Detection
    if (isSpam(validated)) {
      logger.warn('Spam contact form submission detected', {
        ip,
        email: validated.email,
        requestId,
      });
      
      // Return success to spam bots (don't let them know)
      return apiResponse.success(
        { message: 'Thank you for contacting us!' },
        { status: 200, meta: { requestId } }
      );
    }

    // ✅ Auto-detect priority if not provided
    const priority =
      validated.priority || detectPriority(validated.subject, validated.message);

    logger.info('Processing contact form submission', {
      email: validated.email,
      category: validated.category,
      priority,
      isAuthenticated,
      requestId,
    });

    let ticket;
    let feedback;

    // ✅ Authenticated users: Create support ticket
    if (isAuthenticated && session.user.id) {
      ticket = await supportService.createTicket({
        userId: session.user.id,
        subject: validated.subject,
        description: validated.message,
        category: validated.category,
        priority,
        metadata: {
          ...validated.metadata,
          source: 'contact_form',
          ip,
          userAgent: req.headers.get('user-agent') || undefined,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          category: 'support',
          entityType: 'support_ticket',
          entityId: ticket.id,
          description: `Created support ticket: ${validated.subject}`,
          ipAddress: ip,
          userAgent: req.headers.get('user-agent'),
          newValue: {
            ticketNumber: ticket.ticketNumber,
            subject: validated.subject,
            category: validated.category,
          },
        },
      });
    } 
    // ✅ Guest users: Create feedback entry
    else {
      feedback = await prisma.feedback.create({
        data: {
          type: validated.category,
          title: validated.subject,
          message: validated.message,
          page: validated.metadata?.page,
          userAgent: req.headers.get('user-agent'),
          status: 'new',
        },
      });

      logger.info('Guest feedback created', {
        id: feedback.id,
        email: validated.email,
        requestId,
      });
    }

    // ✅ Send Confirmation Email
    try {
     // ✅ Correctly render email HTML as string
const emailHtml = await render(
  await SupportTicketCreatedEmail({
    userName: validated.name,
    ticketNumber: ticket?.ticketNumber || 'N/A',
    ticketId: ticket?.id || '',
    subject: validated.subject,
    category: validated.category,
    priority: priority.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
    description: validated.message,
    expectedResponseTime: getExpectedResponseTime(priority),
  })
);



      await emailService.send({
        to: validated.email,
        subject: ticket
          ? `Support Ticket Created: ${ticket.ticketNumber}`
          : 'We received your message',
        html: emailHtml,
      });

      logger.info('Confirmation email sent', {
        to: validated.email,
        ticketNumber: ticket?.ticketNumber,
        requestId,
      });
    } catch (emailError) {
      // Don't fail the request if email fails
      logger.error('Failed to send confirmation email', { requestId }, emailError);
    }

    // ✅ Send Admin Notification Email (optional)
    if (process.env.ADMIN_EMAIL && priority !== 'LOW') {
      try {
        await emailService.send({
          to: process.env.ADMIN_EMAIL,
          subject: `New ${priority} Priority Contact: ${validated.subject}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${validated.name} (${validated.email})</p>
            <p><strong>Category:</strong> ${validated.category}</p>
            <p><strong>Priority:</strong> ${priority}</p>
            <p><strong>Subject:</strong> ${validated.subject}</p>
            <p><strong>Message:</strong></p>
            <blockquote>${validated.message}</blockquote>
            ${ticket ? `<p><strong>Ticket:</strong> ${ticket.ticketNumber}</p>` : ''}
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/support">View in Dashboard</a></p>
          `,
        });
      } catch (adminEmailError) {
        logger.error('Failed to send admin notification', { requestId }, adminEmailError);
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Contact form processed successfully', {
      ticketNumber: ticket?.ticketNumber,
      feedbackId: feedback?.id,
      duration,
      requestId,
    });

    // ✅ Return Response
    return apiResponse.created(
      {
        ...(ticket
          ? {
              ticketNumber: ticket.ticketNumber,
              ticketId: ticket.id,
              status: ticket.status,
            }
          : { feedbackId: feedback?.id }),
        message: 'We received your message and will respond soon!',
        expectedResponseTime: getExpectedResponseTime(priority),
      },
      {
        requestId,
        duration,
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid contact form data', { errors: error.errors, requestId });
      return apiResponse.validationError(
        'Please check your input',
        error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    logger.error('Contact form submission failed', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// GET - Get Contact Submissions (Authenticated Users)
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication Required
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized contact history access', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const rateLimitResult = await userContactLimiter.check(
      100,
      `contact:get:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { userId: session.user.id, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    // ✅ Validate Query Parameters
    const { searchParams } = new URL(req.url);
    const params = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
    });

    logger.debug('Fetching user tickets', {
      userId: session.user.id,
      params,
      requestId,
    });

    // ✅ Get User's Tickets
    const tickets = await supportService.getUserTickets(
      session.user.id,
      params.status as TicketStatus | undefined
    );

    // ✅ Apply Category Filter
    let filtered = tickets;
    if (params.category) {
      filtered = tickets.filter((t) => t.category === params.category);
    }

    // ✅ Pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filtered.slice(startIndex, endIndex);

    // ✅ Get Statistics
    const stats = await supportService.getStats(session.user.id);

    const duration = Date.now() - startTime;

    logger.info('User tickets fetched', {
      userId: session.user.id,
      total: filtered.length,
      returned: paginatedResults.length,
      duration,
      requestId,
    });

    return apiResponse.paginated(
      paginatedResults,
      {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        hasNextPage: endIndex < filtered.length,
        hasPreviousPage: page > 1,
      },
      {
        meta: {
          requestId,
          duration,
          stats,
        },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid query parameters', { errors: error.errors, requestId });
      return apiResponse.validationError(
        'Invalid query parameters',
        error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    logger.error('Failed to fetch contact history', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
