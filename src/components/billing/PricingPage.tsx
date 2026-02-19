'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Price {
  id: string;
  currency: string;
  unit_amount: number;
  interval: string;
  type: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  features: Array<{ name: string } | string>;
  prices: Price[];
}

export default function PricingPage() {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await apiClient.get<Plan[]>('/api/stripe/plans');
      setPlans(res.data);
    } catch (error) {
      console.error('Failed to fetch plans', error);
      toast.error('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/pricing`;
      return;
    }

    try {
      setProcessingId(priceId);
      const res = await apiClient.post<any>('/api/stripe/checkout', {
        priceId,
        successUrl: window.location.origin + '/dashboard?checkout=success',
        cancelUrl: window.location.origin + '/pricing',
      });

      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      console.error('Checkout failed', error);
      toast.error('Failed to start checkout');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Choose the plan that's right for you and start tracking your progress today.
        </p>

        <div className="mt-8 flex justify-center">
          <div className="bg-zinc-800 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingInterval === 'month'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingInterval === 'year'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              Yearly <span className="text-emerald-400 text-xs ml-1">-20%</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-8">
        {plans.map((plan, index) => {
          const price = plan.prices.find(p => p.interval === billingInterval) || plan.prices[0];
          const isPopular = plan.name.toLowerCase().includes('pro');

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl border p-8 shadow-sm flex flex-col ${isPopular
                ? 'border-indigo-500 bg-zinc-900/50 shadow-indigo-500/20'
                : 'border-zinc-800 bg-black/40'
                }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-sm font-medium text-white">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-2 text-zinc-400 text-sm h-10">{plan.description}</p>
              </div>

              <div className="mb-6 flex items-baseline">
                {price ? (
                  <>
                    <span className="text-4xl font-bold text-white">
                      {price.unit_amount === 0
                        ? 'Free'
                        : new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: price.currency,
                        }).format(price.unit_amount / 100)}
                    </span>
                    {price.unit_amount > 0 && (
                      <span className="ml-2 text-zinc-400">/{billingInterval}</span>
                    )}
                  </>
                ) : (
                  <span className="text-2xl font-bold text-zinc-500">Unavailable</span>
                )}
              </div>

              <ul className="mb-8 space-y-4 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-5 w-5 shrink-0 text-emerald-500 mr-3" />
                    <span className="text-zinc-300 text-sm">
                      {typeof feature === 'string' ? feature : feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => price && handleSubscribe(price.id)}
                disabled={!price || (loading || !!processingId)}
                className={`w-full ${isPopular
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-white text-black hover:bg-zinc-200'
                  }`}
              >
                {processingId === price?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {user
                  ? (price?.unit_amount === 0 ? 'Current Plan' : 'Subscribe')
                  : 'Gt Started'}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
