'use client';

import React, { useState } from 'react';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = '',
}) => {
  const [settings, setSettings] = useState({
    email: true,
    push: false,
    goals: true,
    achievements: true,
    sync: false,
    weekly: true,
  });

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Notification Settings</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Channels</h4>
          <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium text-gray-900">Email Notifications</div>
              <div className="text-sm text-gray-600">Receive notifications via email</div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={settings.push}
              onChange={(e) => setSettings({ ...settings, push: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium text-gray-900">Push Notifications</div>
              <div className="text-sm text-gray-600">Browser push notifications</div>
            </div>
          </label>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-3">Activity</h4>
          {[
            { key: 'goals', label: 'Goal Updates', desc: 'Milestones and deadlines' },
            { key: 'achievements', label: 'Achievements', desc: 'New achievements unlocked' },
            { key: 'sync', label: 'Sync Status', desc: 'Platform sync notifications' },
            { key: 'weekly', label: 'Weekly Summary', desc: 'Weekly progress report' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={settings[item.key as keyof typeof settings]}
                onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                className="w-5 h-5"
              />
              <div>
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-600">{item.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <button className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Save Preferences
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
