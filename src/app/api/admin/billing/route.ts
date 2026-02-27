// src/app/api/admin/billing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SubscriptionTier, SubscriptionStatus, Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { refundInvoice, cancelSubscription, pauseSubscription, resumeSubscription } from '@/lib/stripe-admin';


// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tier: z.nativeEnum(SubscriptionTier).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'currentPeriodEnd', 'priceAmount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
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

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: { limit: number; remaining: number }): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

async function validateAdminSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-billing:${ip}`);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

  if (!isAdmin) {
    return { error: apiResponse.forbidden('Admin access required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return new NextResponse(null, { status: 403 });
    }

    const [totalSubscriptions, activeSubscriptions, totalRevenue] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.invoice.aggregate({
        where: { status: 'paid' },
        _sum: { total: true },
      }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Subscriptions': String(totalSubscriptions),
        'X-Active-Subscriptions': String(activeSubscriptions),
        'X-Total-Revenue': String(totalRevenue._sum.total || 0),
      },
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD admin billing failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Billing overview and subscriptions list
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Overview endpoint
    if (action === 'overview') {
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const [
        totalSubscriptions,
        subscriptionsByTier,
        subscriptionsByStatus,
        revenue30d,
        revenue90d,
        recentInvoices,
        failedPayments,
      ] = await Promise.all([
        prisma.subscription.count(),
        prisma.subscription.groupBy({
          by: ['tier'],
          _count: true,
        }),
        prisma.subscription.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.invoice.aggregate({
          where: { status: 'paid', paidAt: { gte: last30Days } },
          _sum: { total: true },
        }),
        prisma.invoice.aggregate({
          where: { status: 'paid', paidAt: { gte: last90Days } },
          _sum: { total: true },
        }),
        prisma.invoice.findMany({
          where: { status: 'paid' },
          orderBy: { paidAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        }),
        prisma.invoice.count({
          where: { status: 'open', dueDate: { lt: now } },
        }),
      ]);

      const tierMap = subscriptionsByTier.reduce((acc, s) => {
        acc[s.tier] = s._count;
        return acc;
      }, {} as Record<SubscriptionTier, number>);

      const statusMap = subscriptionsByStatus.reduce((acc, s) => {
        acc[s.status] = s._count;
        return acc;
      }, {} as Record<SubscriptionStatus, number>);

      // Calculate MRR (Monthly Recurring Revenue)
      const activeSubscriptions = await prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { priceAmount: true, billingInterval: true },
      });

      const mrr = activeSubscriptions.reduce((total, sub) => {
        const amount = sub.priceAmount || 0;
        const monthlyAmount = sub.billingInterval === 'YEARLY' ? amount / 12 : amount;
        return total + monthlyAmount;
      }, 0);

      const arr = mrr * 12; // Annual Recurring Revenue

      logger.info('Billing overview fetched', {
        requestId,
        duration: Date.now() - startTime,
      });

      const response = apiResponse.success(
        {
          overview: {
            totalSubscriptions,
            activeSubscriptions: statusMap.ACTIVE || 0,
            mrr: Math.round(mrr),
            arr: Math.round(arr),
            revenue30d: revenue30d._sum.total || 0,
            revenue90d: revenue90d._sum.total || 0,
            failedPayments,
          },
          byTier: {
            free: tierMap.FREE || 0,
            starter: tierMap.STARTER || 0,
            pro: tierMap.PRO || 0,
            team: tierMap.TEAM || 0,
            enterprise: tierMap.ENTERPRISE || 0,
          },
          byStatus: statusMap,
          recentInvoices,
        },
        { meta: { requestId } }
      );

      return addHeaders(response, requestId, rateLimitResult);
    }

    // List subscriptions
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      tier: searchParams.get('tier') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit, tier, status, dateFrom, dateTo, sortBy, sortOrder } = queryValidation.data;

    const where: Prisma.SubscriptionWhereInput = {};

    if (tier) where.tier = tier;
    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              username: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    logger.info('Billing subscriptions fetched', {
      total,
      page,
      filters: { tier, status },
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      subscriptions,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin billing failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch billing data', requestId), requestId);
  }
}

// =============================================================================
// POST - Billing actions (refund, cancel, etc.)
// =============================================================================

// Update the POST handler in billing/route.ts



// Replace the POST function with this:

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { action, invoiceId, subscriptionId, reason, feedback, cancelAtPeriodEnd, resumeAt } = body as {
      action: 'refund' | 'cancel' | 'pause' | 'resume';
      invoiceId?: string;
      subscriptionId?: string;
      reason?: string;
      feedback?: string;
      cancelAtPeriodEnd?: boolean;
      resumeAt?: string;
    };

    if (!action) {
      return addHeaders(
        apiResponse.validationError('Action is required', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    switch (action) {
      case 'refund': {
        if (!invoiceId) {
          return addHeaders(
            apiResponse.validationError('Invoice ID is required', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }

        const result = await refundInvoice({ invoiceId, reason: 'requested_by_customer' });

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'ADMIN_ACTION' ,
            category: 'billing',
            entityType: 'invoice',
            entityId: invoiceId,
            description: `Refunded invoice`,
            newValue: { refundId: result.refundId, amount: result.amount } as Prisma.InputJsonValue,
            ipAddress: getClientIp(request),
            performedBy: userId,
          },
        });

        logger.info('Invoice refunded by admin', {
          invoiceId,
          adminId: userId,
          requestId,
          duration: Date.now() - startTime,
        });

        const response = apiResponse.success(
          { message: 'Invoice refunded successfully', ...result },
          { meta: { requestId } }
        );

        return addHeaders(response, requestId, rateLimitResult);
      }

      case 'cancel': {
        if (!subscriptionId) {
          return addHeaders(
            apiResponse.validationError('Subscription ID is required', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }

        const result = await cancelSubscription({
          subscriptionId,
          cancelAtPeriodEnd,
          reason,
          feedback,
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'ADMIN_ACTION',
            category: 'billing',
            entityType: 'subscription',
            entityId: subscriptionId,
            description: `Cancelled subscription`,
            newValue: { cancelAtPeriodEnd, reason } as Prisma.InputJsonValue,
            ipAddress: getClientIp(request),
            performedBy: userId,
          },
        });

        logger.info('Subscription cancelled by admin', {
          subscriptionId,
          adminId: userId,
          requestId,
          duration: Date.now() - startTime,
        });

        const response = apiResponse.success(
          { message: 'Subscription cancelled successfully', ...result },
          { meta: { requestId } }
        );

        return addHeaders(response, requestId, rateLimitResult);
      }

      case 'pause': {
        if (!subscriptionId) {
          return addHeaders(
            apiResponse.validationError('Subscription ID is required', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }

        const result = await pauseSubscription({
          subscriptionId,
          resumeAt: resumeAt ? new Date(resumeAt) : undefined,
        });

        logger.info('Subscription paused by admin', { subscriptionId, adminId: userId });

        return addHeaders(
          apiResponse.success({ message: 'Subscription paused', ...result }, { meta: { requestId } }),
          requestId,
          rateLimitResult
        );
      }

      case 'resume': {
        if (!subscriptionId) {
          return addHeaders(
            apiResponse.validationError('Subscription ID is required', undefined, requestId),
            requestId,
            rateLimitResult
          );
        }

        const result = await resumeSubscription(subscriptionId);

        logger.info('Subscription resumed by admin', { subscriptionId, adminId: userId });

        return addHeaders(
          apiResponse.success({ message: 'Subscription resumed', ...result }, { meta: { requestId } }),
          requestId,
          rateLimitResult
        );
      }

      default:
        return addHeaders(
          apiResponse.validationError(`Unknown action: ${action}`, undefined, requestId),
          requestId,
          rateLimitResult
        );
    }
  } catch (error) {
    logger.error('POST admin billing action failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to perform billing action', requestId), requestId);
  }
}



export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';