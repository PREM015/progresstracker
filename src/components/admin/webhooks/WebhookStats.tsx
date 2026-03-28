// src/components/admin/webhooks/WebhookStats.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Webhook, Activity, CheckCircle, XCircle } from 'lucide-react';

interface Stats {
  totalWebhooks: number;
  activeWebhooks: number;
  inactiveWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
}

export function WebhookStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/admin/webhooks/stats').then((r) => r.json()).then((d) => setStats(d.data));
  }, []);

  const cards = [
    { label: 'Total', value: stats?.totalWebhooks ?? 0, Icon: Webhook, color: 'blue' },
    { label: 'Active', value: stats?.activeWebhooks ?? 0, Icon: CheckCircle, color: 'green' },
    { label: 'Total Deliveries', value: stats?.totalDeliveries ?? 0, Icon: Activity, color: 'indigo' },
    { label: 'Failed', value: stats?.failedDeliveries ?? 0, Icon: XCircle, color: 'red' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(({ label, value, Icon, color }) => (
        <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Icon className={`h-5 w-5 text-${color}-500 mb-2`} />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{!stats ? '—' : value.toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
        </div>
      ))}
      {stats && (
        <div className="col-span-2 sm:col-span-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Delivery Success Rate</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.successRate}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${stats.successRate}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default WebhookStats;
