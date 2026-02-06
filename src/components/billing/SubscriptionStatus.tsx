'use client';

import React, { useState, useEffect } from 'react';

interface Subscription {
  id: string;
  tier: string;
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionStatusProps {
  userId: string;
  className?: string;
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  userId,
  className = '',
}) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.json())
      .then(data => setSubscription(data))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  if (!subscription) return <div className="text-gray-500">No active subscription</div>;

  const statusColors = {
    active: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    past_due: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Subscription Status</h3>
        <span className={`px-4 py-2 rounded-full text-sm font-medium border ${statusColors[subscription.status]}`}>
          {subscription.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Plan:</span>
          <span className="font-semibold text-gray-900">{subscription.tier}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Renews on:</span>
          <span className="font-semibold text-gray-900">
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </span>
        </div>
        {subscription.cancelAtPeriodEnd && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700 text-sm">
              Your subscription will be cancelled at the end of this billing period.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Manage Plan
        </button>
        {!subscription.cancelAtPeriodEnd && (
          <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default SubscriptionStatus;
