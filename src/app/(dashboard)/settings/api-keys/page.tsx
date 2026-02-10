"use client";

import { useState, useEffect } from "react";
import { ApiKeyForm, ApiKeyList } from "@/components/api-keys";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKey, setShowNewKey] = useState(false);

  useEffect(() => {
    fetch('/api/user/api-keys')
      .then(r => r.json())
      .then(data => setApiKeys(data.keys || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const createApiKey = async (name: string) => {
    const res = await fetch('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    setApiKeys([...apiKeys, data.key]);
    setShowNewKey(false);
  };

  const deleteApiKey = async (id: string) => {
    await fetch(`/api/user/api-keys/${id}`, { method: 'DELETE' });
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">API Keys</h1>
          {!showNewKey && (
            <button
              onClick={() => setShowNewKey(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create New Key
            </button>
          )}
        </div>

        {showNewKey && (
          <ApiKeyForm
            onCreate={createApiKey}
            onCancel={() => setShowNewKey(false)}
          />
        )}

        <ApiKeyList
          keys={apiKeys}
          onDelete={deleteApiKey}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
