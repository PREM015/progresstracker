'use client';

import React from 'react';

interface PushNotificationPromptProps {
  onEnable: () => void;
  onDismiss: () => void;
  className?: string;
}

export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({
  onEnable,
  onDismiss,
  className = '',
}) => {
  return (
    <div className={`bg-indigo-50 border border-indigo-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="text-4xl">🔔</div>
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-2">Enable Push Notifications</h4>
          <p className="text-gray-700 text-sm mb-4">
            Stay updated on your progress, goals, and achievements with real-time notifications.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onEnable}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Enable
            </button>
            <button
              onClick={onDismiss}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
