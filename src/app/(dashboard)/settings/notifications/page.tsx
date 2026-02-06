"use client";

import { NotificationSettings } from "@/components/settings";

export default function SettingsNotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Notification Settings</h1>
        <NotificationSettings />
      </div>
    </div>
  );
}
