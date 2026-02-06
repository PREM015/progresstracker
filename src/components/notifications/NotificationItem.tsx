'use client';

import React from 'react';

interface NotificationItemProps {
  title: string;
  message: string;
  time: string;
  icon: string;
  unread?: boolean;
  onClick?: () => void;
  className?: string;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  title,
  message,
  time,
  icon,
  unread = false,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${unread ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
        } ${className}`}
    >
      <span className="text-3xl">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold">{title}</div>
          {unread && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
        </div>
        <div className="text-sm text-gray-700 mt-1">{message}</div>
        <div className="text-xs text-gray-500 mt-2">{time}</div>
      </div>
    </div>
  );
};

export default NotificationItem;
