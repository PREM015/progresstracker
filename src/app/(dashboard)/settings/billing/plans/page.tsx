"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BillingPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/billing/plans').then(r => r.json()),
      fetch('/api/billing/current').then(r => r.json())
    ])
      .then(([plansData, currentData]) => {
        setPlans(plansData.plans || []);
        setCurrentPlan(currentData.plan);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const changePlan = async (planId: string) => {
    await fetch('/api/billing/change-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    router.push('/settings/billing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Change Plan</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`bg-white border-2 rounded-xl p-8 ${currentPlan?.id === plan.id
                  ? 'border-indigo-600'
                  : 'border-gray-200'
                }`}
            >
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="text-4xl font-bold text-indigo-600 mb-6">
                ${plan.price}
                <span className="text-lg text-gray-600">/mo</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features?.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {currentPlan?.id === plan.id ? (
                <button
                  disabled
                  className="w-full py-3 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => changePlan(plan.id)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {plan.price > (currentPlan?.price || 0) ? 'Upgrade' : 'Downgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
