"use client";

import { useState, useEffect } from "react";

export default function LoginHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/login-history')
      .then(r => r.json())
      .then(data => setHistory(data.history || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Login History</h1>

        {history.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🔐</span>
            <p className="mt-4 text-gray-500">No login history available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${entry.success ? 'bg- green-100' : 'bg-red-100'
                      }`}>
                      <span className="text-2xl">{entry.success ? '✓' : '✕'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900">
                          {entry.success ? 'Successful Login' : 'Failed Login'}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded ${entry.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {entry.method || 'Password'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>IP Address: {entry.ipAddress}</div>
                        <div>Location: {entry.location || 'Unknown'}</div>
                        <div>Device: {entry.device || 'Unknown Device'}</div>
                        <div>Browser: {entry.browser || 'Unknown Browser'}</div>
                        {!entry.success && entry.reason && (
                          <div className="text-red-600">Reason: {entry.reason}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
