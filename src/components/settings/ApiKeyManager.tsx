'use client';

import React, { useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

interface ApiKeyManagerProps {
  className?: string;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({
  className = '',
}) => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showNewKey, setShowNewKey] = useState(false);

  const generateKey = () => {
    const newKey = {
      id: Date.now().toString(),
      name: 'New API Key',
      key: 'pk_' + Math.random().toString(36).substring(2),
      createdAt: new Date().toISOString(),
    };
    setKeys([...keys, newKey]);
    setShowNewKey(true);
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">API Keys</h3>
        <button
          onClick={generateKey}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + New Key
        </button>
      </div>

      <div className="space-y-3">
        {keys.map(key => (
          <div key={key.id} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{key.name}</div>
              <button className="text-red-600 hover:text-red-700">Revoke</button>
            </div>
            <div className="text-sm font-mono bg-gray-100 px-3 py-2 rounded">
              {key.key}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Created {new Date(key.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}

        {keys.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">🔑</span>
            No API keys created
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeyManager;
