"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function APIKeyDetailPage() {
  const params = useParams();
  const keyId = params.id as string;

  const [apiKey, setApiKey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    fetch(`/api/user/api-keys/${keyId}`)
      .then(r => r.json())
      .then(data => setApiKey(data.apiKey))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [keyId]);

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;

    setRevoking(true);
    try {
      await fetch(`/api/user/api-keys/${keyId}`, { method: 'DELETE' });
      window.location.href = '/settings/api-keys';
    } catch (err) {
      console.error(err);
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🔑</span>
          <p className="mt-4 text-gray-500">API Key not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">API Key Details</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Name</div>
              <div className="text-lg font-bold">{apiKey.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Status</div>
              <span className={`px-3 py-1 rounded-lg text-sm ${apiKey.status === 'ACTIVE'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
                }`}>
                {apiKey.status}
              </span>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Created</div>
              <div className="text-lg">{new Date(apiKey.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Last Used</div>
              <div className="text-lg">
                {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString() : 'Never'}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">API Key</div>
            <code className="block p-3 bg-gray-100 rounded font-mono text-sm break-all">
              {apiKey.maskedKey}
            </code>
          </div>

          {apiKey.permissions && apiKey.permissions.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">Permissions</div>
              <div className="flex flex-wrap gap-2">
                {apiKey.permissions.map((permission: string) => (
                  <span key={permission} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm">
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-200">
            <h3 className="font-bold text-lg mb-4">Usage Statistics</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Total Requests</div>
                <div className="text-2xl font-bold text-indigo-600">{apiKey.totalRequests || 0}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Last 24h</div>
                <div className="text-2xl font-bold text-indigo-600">{apiKey.requests24h || 0}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Error Rate</div>
                <div className="text-2xl font-bold text-indigo-600">{apiKey.errorRate || 0}%</div>
              </div>
            </div>
          </div>
        </div>

        {apiKey.status === 'ACTIVE' && (
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {revoking ? 'Revoking...' : 'Revoke API Key'}
          </button>
        )}
      </div>
    </div>
  );
}
