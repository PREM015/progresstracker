// src/app/api/stripe/plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { STRIPE_PLANS } from '@/lib/stripe';
import apiResponse from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/stripe/plans
 * Returns all available subscription plans with features and pricing
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const interval = searchParams.get('interval') || 'monthly'; // 'monthly' | 'yearly'

    const plans = Object.entries(STRIPE_PLANS).map(([key, plan]) => {
      const p = plan as any;
      return {
      id: key,
      tier: key,
      name: p.name,
      description: p.description,
      features: p.features,
      limits: {
        platforms: p.limits?.platforms || p.limits?.platformLimit,
        syncFrequencyMinutes: p.limits?.syncFrequencyMinutes,
        exportsPerMonth: p.limits?.exportsPerMonth || p.limits?.exportLimitMonthly,
        apiRequestsDaily: p.limits?.apiRequestsDaily,
      },
      pricing: {
        monthly: {
          priceId: p.priceId || p.priceIds?.monthly,
          amount: p.priceAmount ?? p.price?.monthly ?? 0,
          currency: 'usd',
          interval: 'month',
          display: p.priceAmount ? `$${p.priceAmount / 100}/mo` : 'Free',
        },
        yearly: {
          priceId: p.priceIdYearly || p.priceIds?.yearly,
          amount: p.priceAmountYearly ?? p.price?.yearly ?? 0,
          currency: 'usd',
          interval: 'year',
          display: p.priceAmountYearly ? `$${p.priceAmountYearly / 100}/yr` : 'Free',
          savingsPercent: p.priceAmount && p.priceAmountYearly
            ? Math.round((1 - p.priceAmountYearly / (p.priceAmount * 12)) * 100)
            : 0,
        },
      },
      popular: key === 'PRO',
      recommended: key === 'PRO',
    }});

    logger.info('Plans fetched', { userId: session?.user?.id, interval });

    return apiResponse.success({ plans, interval });
  } catch (error) {
    logger.error('Failed to fetch plans', {}, error);
    return apiResponse.internalError('Failed to fetch plans');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
