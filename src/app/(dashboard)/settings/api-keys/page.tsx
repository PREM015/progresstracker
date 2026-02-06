"use client";

import { useState, useEffect } from "react";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  useEffect(() => {
    fetch('/api/user/api-keys')
      .then(r => r.json())
      .then(data => setApiKeys(data.keys || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const createApiKey = async () => {
    const res = await fetch('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName })
    });
    const data = await res.json();
    setApiKeys([...apiKeys, data.key]);
    setNewKeyName("");
    setShowNewKey(false);
  };

  const deleteApiKey = async (id: string) => {
    await fetch(`/api/user/api-keys/${id}`, { method: 'DELETE' });
    setApiKeys(apiKeys.filter(k => k.id !== id));
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">API Keys</h1>
          <button
            onClick={() => setShowNewKey(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create New Key
          </button>
        </div>

        {showNewKey && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Create New API Key</h3>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., 'Production API')"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={createApiKey}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewKey(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🔑</span>
            <p className="mt-4 text-gray-500">No API keys yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map(key => (
              <div key={key.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{key.name}</h3>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                      {key.key || '••••••••••••••••'}
                    </code>
                    <p className="text-xs text-gray-500 mt-2">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
