'use client';

import React, { useState, useEffect } from 'react';

interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
  connectedAt: string;
  icon: string;
}

interface ConnectedAccountsProps {
  className?: string;
}

export const ConnectedAccounts: React.FC<ConnectedAccountsProps> = ({
  className = '',
}) => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  useEffect(() => {
    fetch('/api/user/connected-accounts')
      .then(r => r.json())
      .then(data => setAccounts(data));
  }, []);

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Connected Accounts</h3>

      <div className="space-y-3">
        {accounts.map(account => (
          <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-3xl">{account.icon}</span>
              <div>
                <div className="font-semibold">{account.platform}</div>
                <div className="text-sm text-gray-600">@{account.username}</div>
              </div>
            </div>
            <button className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
              Disconnect
            </button>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">🔗</span>
            No accounts connected
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectedAccounts;
