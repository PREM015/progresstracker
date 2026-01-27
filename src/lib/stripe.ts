import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const STRIPE_PLANS = {
  FREE: {
    name: 'Free',
    priceId: null,
    features: ['5 platforms', '30 day history', 'Basic analytics'],
  },
  PRO: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ['Unlimited platforms', 'Unlimited history', 'Advanced analytics', 'Priority support'],
  },
  TEAM: {
    name: 'Team',
    priceId: process.env.STRIPE_TEAM_PRICE_ID,
    features: ['Everything in Pro', 'Team management', 'API access', 'Custom integrations'],
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PLANS;
