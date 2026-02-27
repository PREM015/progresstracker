"use client";

import { useState, useEffect } from "react";

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/sessions')
      .then(r => r.json())
      .then(data => setSessions(data.sessions || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const revokeSession = async (sessionId: string) => {
    await fetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  const revokeAll = async () => {
    if (!confirm('Revoke all other sessions? You will stay logged in on this device.')) return;

    await fetch('/api/auth/sessions/revoke-all', { method: 'POST' });
    setSessions(sessions.filter(s => s.isCurrent));
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
          <h1 className="text-4xl font-bold">Active Sessions</h1>
          {sessions.filter(s => !s.isCurrent).length > 0 && (
            <button
              onClick={revokeAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Revoke All Other Sessions
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🔒</span>
            <p className="mt-4 text-gray-500">No active sessions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className={`bg-white border rounded-xl p-6 ${session.isCurrent ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {session.isCurrent && (
                      <span className="inline-block px-2 py-1 bg-indigo-600 text-white text-xs rounded mb-2">
                        Current Session
                      </span>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {session.device?.includes('Mobile') ? '📱' :
                          session.device?.includes('Tablet') ? '💻' : '🖥️'}
                      </span>
                      <div>
                        <h3 className="font-bold text-gray-900">{session.device || 'Unknown Device'}</h3>
                        <p className="text-sm text-gray-600">{session.browser || 'Unknown Browser'}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>IP Address: {session.ipAddress}</div>
                      <div>Location: {session.location || 'Unknown'}</div>
                      <div>Last Active: {new Date(session.lastActive).toLocaleString()}</div>
                      <div>Created: {new Date(session.createdAt).toLocaleString()}</div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
