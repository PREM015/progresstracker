'use client';

import React from 'react';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = '',
}) => {
  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Notification Preferences</h3>

      <div className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3">Email Notifications</h4>
          <div className="space-y-2">
            {['Goals completed', 'New achievements', 'Weekly summary', 'Platform sync updates'].map(item => (
              <label key={item} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" defaultChecked className="w-5 h-5" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Push Notifications</h4>
          <div className="space-y-2">
            {['Streak reminders', 'Daily summary'].map(item => (
              <label key={item} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" defaultChecked className="w-5 h-5" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        <button className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Save Preferences
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
