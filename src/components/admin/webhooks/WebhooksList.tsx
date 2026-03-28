// src/components/admin/webhooks/WebhooksList.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

interface Webhook {
  id: string;
  url: string;
  isActive: boolean;
  failureCount: number;
  createdAt: string;
  events: string[];
  user?: { name?: string | null; email: string } | null;
  _count?: { deliveries: number };
}

interface Props {
  onSelect?: (webhook: Webhook) => void;
}

export function WebhooksList({ onSelect }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/webhooks?page=${page}&limit=20`);
    if (res.ok) { const d = await res.json(); setWebhooks(d.data.webhooks); setTotal(d.data.total); }
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className="text-sm text-gray-400 text-center py-8">Loading…</div>;

  return (
    <div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {webhooks.map((w) => (
          <div key={w.id} className="flex items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {w.isActive ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{w.url}</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 ml-6">
                {w.user && <span>{w.user.email}</span>}
                {w.failureCount > 0 && <span className="text-red-400">{w.failureCount} failures</span>}
                <span>{w._count?.deliveries ?? 0} deliveries</span>
              </div>
            </div>
            <button onClick={() => onSelect?.(w)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors">
              <ExternalLink className="h-4 w-4" />
            </button>
            <button onClick={() => deleteWebhook(w.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Prev</button>
          <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

export default WebhooksList;
