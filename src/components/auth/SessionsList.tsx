// components/auth/SessionsList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { formatLocationLabel, formatDeviceLabel } from '@/types/security';
import { getRelativeTime } from '@/lib/utils';

interface Session {
  id: string;
  device?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  isCurrent: boolean;
  lastActiveAt: Date;
  createdAt: Date;
}

export default function SessionsList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get('/auth/sessions');
      if (response.error) {
        setError(response.error);
      } else {
        setSessions(response.data.sessions || []);
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;

    setRevokingId(sessionId);

    try {
      const response = await apiClient.delete(`/auth/sessions/${sessionId}`);
      
      if (response.error) {
        setError(response.error);
      } else {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (err) {
      console.error('Revoke session error:', err);
      setError('Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (device?: string) => {
    if (device?.toLowerCase().includes('mobile')) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No active sessions found
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <div
              key={session.id}
              className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
                    {getDeviceIcon(session.device)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {formatDeviceLabel(session as never)}
                      </h4>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <p className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {formatLocationLabel(session as never)}
                      </p>
                      <p className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last active {getRelativeTime(new Date(session.lastActiveAt))}
                      </p>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length > 1 && (
        <button
          onClick={() => {
            if (confirm('Are you sure you want to revoke all other sessions?')) {
              // Implement revoke all
            }
          }}
          className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
        >
          Revoke All Other Sessions
        </button>
      )}
    </div>
  );
}