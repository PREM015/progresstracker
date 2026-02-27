'use client';

import React from 'react';
import NotificationList from '@/components/notifications/NotificationList';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <NotificationList />
      </div>
    </div>
  );
}
