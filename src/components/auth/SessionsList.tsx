// components/auth/SessionsList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { formatLocationLabel, formatDeviceLabel, type ActiveSession } from '@/types/security';

// Inline utility since getRelativeTime is not exported from @/lib/utils
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/forms/FormError';
import { Laptop, Smartphone, Globe, Clock, Loader2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function SessionsList() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
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
        setSessions((response.data as { sessions?: ActiveSession[] })?.sessions || []);
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
      return <Smartphone className="h-5 w-5" />;
    }
    return <Laptop className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <FormError message={error} variant="block" />}

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No active sessions found
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <Card key={session.id} className="overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                    {getDeviceIcon(session.device)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">
                        {formatDeviceLabel(session)}
                      </h4>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {formatLocationLabel(session)}
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last active {getRelativeTime(new Date(session.lastActiveAt))}
                      </p>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {revokingId === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="sr-only">Revoke</span>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {sessions.length > 1 && (
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            if (confirm('Are you sure you want to revoke all other sessions?')) {
              // Implement revoke all logic here if API supports it
            }
          }}
        >
          Revoke All Other Sessions
        </Button>
      )}
    </div>
  );
}

export default SessionsList;