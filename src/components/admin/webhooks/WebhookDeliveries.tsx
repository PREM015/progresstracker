// src/components/admin/webhooks/WebhookDeliveries.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface Delivery {
  id: string;
  event: string;
  status: string;
  responseStatus?: number | null;
  duration?: number | null;
  errorMessage?: string | null;
  createdAt: string;
}

interface Props {
  webhookId: string;
}

export function WebhookDeliveries({ webhookId }: Props) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/webhooks/${webhookId}/deliveries?limit=50`);
    if (res.ok) setDeliveries((await res.json()).data?.deliveries ?? []);
    setLoading(false);
  }, [webhookId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>;
  if (!deliveries.length) return <div className="text-sm text-gray-400 py-4 text-center">No deliveries yet.</div>;

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {deliveries.map((d) => (
        <div key={d.id} className="flex items-center gap-3 py-2.5">
          {d.status === 'SUCCESS' ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            : d.status === 'RETRYING' ? <RefreshCw className="h-4 w-4 text-yellow-400 flex-shrink-0" />
            : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{d.event}</p>
            {d.errorMessage && <p className="text-xs text-red-400 truncate">{d.errorMessage}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            {d.responseStatus && <span className="text-xs font-mono text-gray-500">{d.responseStatus}</span>}
            {d.duration && <span className="text-xs text-gray-400 block">{d.duration}ms</span>}
            <span className="text-xs text-gray-400 block">{new Date(d.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default WebhookDeliveries;
