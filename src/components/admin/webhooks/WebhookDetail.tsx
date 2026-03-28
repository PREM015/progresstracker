// src/components/admin/webhooks/WebhookDetail.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Globe, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface Webhook {
  id: string;
  url: string;
  isActive: boolean;
  events: string[];
  failureCount: number;
  createdAt: string;
  description?: string | null;
  user?: { name?: string | null; email: string } | null;
  _count?: { deliveries: number };
}

interface Props {
  webhookId: string;
}

export function WebhookDetail({ webhookId }: Props) {
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/webhooks/${webhookId}`)
      .then((r) => r.json())
      .then((d) => setWebhook(d.data))
      .finally(() => setLoading(false));
  }, [webhookId]);

  if (loading) return <div className="text-sm text-gray-400">Loading…</div>;
  if (!webhook) return <div className="text-sm text-red-400">Webhook not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${webhook.isActive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
          {webhook.isActive ? <Globe className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{webhook.url}</p>
          {webhook.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{webhook.description}</p>}
          {webhook.user && <p className="text-xs text-gray-400 mt-1">{webhook.user.email}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
          <Activity className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{webhook._count?.deliveries ?? 0}</div>
          <div className="text-xs text-gray-400">Deliveries</div>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
          {webhook.failureCount > 0 ? <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-1" /> : <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />}
          <div className="text-lg font-bold text-gray-900 dark:text-white">{webhook.failureCount}</div>
          <div className="text-xs text-gray-400">Failures</div>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{webhook.events.length}</div>
          <div className="text-xs text-gray-400">Events</div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subscribed Events</p>
        <div className="flex flex-wrap gap-1.5">
          {webhook.events.map((e) => (
            <span key={e} className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">{e}</span>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400">Created {new Date(webhook.createdAt).toLocaleDateString()}</p>
    </div>
  );
}

export default WebhookDetail;
