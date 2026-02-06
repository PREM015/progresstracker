"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();
  const [plan, setPlan] = useState('PRO');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [processing, setProcessing] = useState(false);

  const prices: Record<string, Record<string, number>> = {
    PRO: { MONTHLY: 9, YEARLY: 90 },
    TEAM: { MONTHLY: 29, YEARLY: 290 },
    ENTERPRISE: { MONTHLY: 99, YEARLY: 990 },
  };

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle }),
      });
      const data = await res.json();

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error(err);
      setProcessing(false);
    }
  };

  const currentPrice = prices[plan][billingCycle];
  const savings = billingCycle === 'YEARLY' ? Math.round((prices[plan].MONTHLY * 12 - currentPrice) / prices[plan].MONTHLY / 12 * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Complete Your Purchase</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Select Plan</h2>
              <div className="space-y-3">
                {['PRO', 'TEAM', 'ENTERPRISE'].map(planOption => (
                  <button
                    key={planOption}
                    onClick={() => setPlan(planOption)}
                    className={`w-full text-left p-4 border-2 rounded-lg transition ${plan === planOption
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="font-bold text-lg">{planOption}</div>
                    <div className="text-sm text-gray-600">
                      ${prices[planOption].MONTHLY}/month
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Billing Cycle</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`w-full text-left p-4 border-2 rounded-lg transition ${billingCycle === 'MONTHLY'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="font-bold">Monthly</div>
                  <div className="text-sm text-gray-600">Billed monthly</div>
                </button>
                <button
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`w-full text-left p-4 border-2 rounded-lg transition ${billingCycle === 'YEARLY'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">Yearly</div>
                      <div className="text-sm text-gray-600">Save {savings}%</div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      SAVE
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-8">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium">{plan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Billing</span>
                  <span className="font-medium">{billingCycle}</span>
                </div>
                {billingCycle === 'YEARLY' && (
                  <div className="flex items-center justify-between text-green-600">
                    <span>Savings</span>
                    <span className="font-medium">{savings}%</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-indigo-600">
                      ${currentPrice}/{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full px-6 py-4 bg-indigo-600 text-white text-lg font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Proceed to Payment'}
              </button>

              <div className="mt-4 text-xs text-gray-500 text-center">
                <p>Secure checkout powered by Stripe</p>
                <p className="mt-1">Cancel anytime • 14-day free trial</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
