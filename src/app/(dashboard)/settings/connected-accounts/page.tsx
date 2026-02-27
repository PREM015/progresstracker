"use client";

import { useState } from "react";

export default function ConnectedAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([
    { id: '1', provider: 'Google', email: 'user@gmail.com', connectedAt: new Date() },
    { id: '2', provider: 'GitHub', email: 'user@github.com', connectedAt: new Date() },
  ]);

  const disconnectAccount = async (id: string) => {
    await fetch(`/api/auth/disconnect/${id}`, { method: 'POST' });
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      Google: '🔵',
      GitHub: '⚫',
      Facebook: '🔷',
      Twitter: '🐦',
    };
    return icons[provider] || '🔗';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Connected Accounts</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <p className="text-gray-700 mb-4">
            Manage the third-party accounts you've connected to ProgressTracker for authentication.
          </p>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🔗</span>
            <p className="mt-4 text-gray-500">No connected accounts</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map(account => (
              <div key={account.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{getProviderIcon(account.provider)}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{account.provider}</h3>
                      <p className="text-sm text-gray-600">{account.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Connected {new Date(account.connectedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnectAccount(account.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <h3 className="font-bold text-indigo-900 mb-2">Connect More Accounts</h3>
          <p className="text-sm text-indigo-800 mb-4">
            Link additional accounts for easier sign-in and increased account security.
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              + Google
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              + GitHub
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              + Facebook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
