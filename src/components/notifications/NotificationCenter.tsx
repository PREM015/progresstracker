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

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => setNotifications(data));
  }, []);

  const typeConfig = {
    info: { icon: 'ℹ️', bg: 'bg-blue-50', border: 'border-blue-200' },
    success: { icon: '✅', bg: 'bg-green-50', border: 'border-green-200' },
    warning: { icon: '⚠️', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    error: { icon: '❌', bg: 'bg-red-50', border: 'border-red-200' },
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Notifications</h3>

      <div className="space-y-3">
        {notifications.map(notif => {
          const config = typeConfig[notif.type];
          return (
            <div
              key={notif.id}
              className={`p-4 border rounded-lg ${config.bg} ${config.border} ${notif.read ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold">{notif.title}</div>
                  <div className="text-sm text-gray-700 mt-1">{notif.message}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </div>
                {!notif.read && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
              </div>
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">🔔</span>
            No notifications
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
