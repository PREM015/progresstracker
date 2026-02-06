'use client';

import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

interface NotificationListProps {
  userId: string;
  className?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  userId,
  className = '',
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => setNotifications(data))
      .finally(() => setLoading(false));
  }, [userId]);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const filteredNotifications = notifications.filter(n => filter === 'all' || !n.read);

  const typeIcons = {
    info: '📘',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  const typeColors = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200',
  };

  if (loading) {
    return <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No notifications {filter === 'unread' && 'to read'}
          </div>
        ) : (
          filteredNotifications.map(notif => (
            <div
              key={notif.id}
              className={`border-2 rounded-xl p-4 ${typeColors[notif.type]} ${!notif.read && 'shadow-md'
                }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{typeIcons[notif.type]}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{notif.message}</p>
                  <span className="text-xs text-gray-500">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationList;
