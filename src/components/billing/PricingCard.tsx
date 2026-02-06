'use client';

import React from 'react';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

interface PricingCardProps {
  tier: PricingTier;
  currentTier?: string;
  onSelect?: (tierId: string) => void;
  className?: string;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  currentTier,
  onSelect,
  className = '',
}) => {
  const isCurrent = currentTier === tier.id;

  return (
    <div className={`relative bg-white border-2 ${tier.popular ? 'border-indigo-600 shadow-xl scale-105' : 'border-gray-200'
      } rounded-xl p-8 ${className}`}>
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl font-bold text-gray-900">${tier.price}</span>
          <span className="text-gray-600">/{tier.interval}</span>
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <span className="text-green-500 mt-1">✓</span>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect?.(tier.id)}
        disabled={isCurrent}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${isCurrent
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : tier.popular
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
      >
        {isCurrent ? 'Current Plan' : 'Select Plan'}
      </button>
    </div>
  );
};

export default PricingCard;
