'use client';

import React, { useEffect, useState } from 'react';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/notifications?limit=10');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch notifications');
        setNotifications(json?.data?.notifications || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load notifications');
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [isOpen]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = (dateStr: string) => {
    const ts = new Date(dateStr).getTime();
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0" onClick={onClose} />
      <div className={`absolute right-0 top-full mt-2 w-80 bg-white border rounded-xl shadow-2xl z-50 ${className}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-bold">Notifications</h4>
            <button onClick={markAllRead} className="text-xs text-indigo-600">
              Mark all as read
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-500">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No notifications</div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${notif.isRead ? '' : 'bg-blue-50'}`}
              >
                <div className="flex items-start gap-3">
                  {!notif.isRead && <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2" />}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{notif.title || notif.shortMessage || 'Notification'}</div>
                    <div className="text-xs text-gray-600 mt-1">{notif.message}</div>
                    <div className="text-xs text-gray-500 mt-1">{timeAgo(notif.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t text-center">
          <a href="/notifications" className="text-sm text-indigo-600 hover:text-indigo-700">
            View All Notifications
          </a>
        </div>
      </div>
    </>
  );
};

export default NotificationDropdown;
