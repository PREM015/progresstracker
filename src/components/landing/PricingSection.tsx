'use client';

import React from 'react';

interface PricingSectionProps {
  className?: string;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  className = '',
}) => {
  const plans = [
    { name: 'Free', price: '$0', features: ['5 platforms', 'Basic analytics', 'Community support'], cta: 'Get Started', popular: false },
    { name: 'Pro', price: '$9', features: ['Unlimited platforms', 'Advanced analytics', 'Priority support', 'Custom goals'], cta: 'Start Free Trial', popular: true },
    { name: 'Team', price: '$29', features: ['Everything in Pro', 'Team management', 'Shared dashboards', 'API access'], cta: 'Contact Sales', popular: false },
  ];

  return (
    <section className={`py-20 ${className}`}>
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-4">Simple Pricing</h2>
        <p className="text-gray-600 text-center mb-16">Choose the perfect plan for your needs</p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${plan.popular ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-2xl scale-105' : 'bg-white border-2'
                }`}
            >
              {plan.popular && <div className="text-xs font-bold mb-4 opacity-90">MOST POPULAR</div>}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="text-4xl font-bold mb-6">{plan.price}<span className="text-lg">/mo</span></div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span>✓</span> {feature}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-3 rounded-lg font-bold ${plan.popular ? 'bg-white text-indigo-600 hover:bg-gray-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
