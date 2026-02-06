'use client';

import React, { useState, useEffect } from 'react';

interface LoginSession {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  loginAt: string;
  isCurrent: boolean;
}

interface LoginHistoryProps {
  className?: string;
}

export const LoginHistory: React.FC<LoginHistoryProps> = ({
  className = '',
}) => {
  const [sessions, setSessions] = useState<LoginSession[]>([]);

  useEffect(() => {
    fetch('/api/user/login-history')
      .then(r => r.json())
      .then(data => setSessions(data));
  }, []);

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Login History</h3>

      <div className="space-y-3">
        {sessions.map(session => (
          <div key={session.id} className={`p-4 border rounded-lg ${session.isCurrent ? 'bg-green-50 border-green-200' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {session.device}
                  {session.isCurrent && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Current</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {session.location} • {session.ipAddress}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(session.loginAt).toLocaleString()}
                </div>
              </div>
              {!session.isCurrent && (
                <button className="text-red-600 hover:text-red-700 text-sm">
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoginHistory;
