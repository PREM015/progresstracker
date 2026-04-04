// src/app/api/stripe/customer-portal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createPortalSession } from '@/lib/stripe';
import apiResponse from '@/lib/apiResponse';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  returnUrl: z.string().url().optional(),
});

/**
 * POST /api/stripe/customer-portal
 * Creates a Stripe billing portal session and returns the URL
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required');
    }

    let body: z.infer<typeof bodySchema> = {};
    try {
      const raw = await request.json();
      const parsed = bodySchema.safeParse(raw);
      if (parsed.success) body = parsed.data;
    } catch {
      // body is optional
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
    const returnUrl = body.returnUrl || `${appUrl}/billing`;

    // Get user's Stripe customer ID
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
      return apiResponse.validationError('No billing account found. Please subscribe to a plan first.');
    }

    const portalSession = await createPortalSession(subscription.stripeCustomerId, returnUrl);

    logger.info('Stripe portal session created', { userId: session.user.id });

    return apiResponse.success({ url: portalSession.url });
  } catch (error) {
    logger.error('Failed to create Stripe portal session', {}, error);
    return apiResponse.internalError('Failed to create billing portal session');
  }
}

/**
 * GET /api/stripe/customer-portal
 * Returns portal configuration info
 */
export async function GET(): Promise<NextResponse> {
  return apiResponse.success({
    description: 'POST to this endpoint to get a Stripe billing portal URL',
    features: ['View invoices', 'Update payment methods', 'Cancel subscription', 'Manage subscription'],
  });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
