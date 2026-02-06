'use client';

import React, { useState } from 'react';

interface PreferencesStepProps {
  onNext: (prefs: any) => void;
  className?: string;
}

export const PreferencesStep: React.FC<PreferencesStepProps> = ({
  onNext,
  className = '',
}) => {
  const [preferences, setPreferences] = useState({
    theme: 'light',
    notifications: true,
    weeklyReport: true,
  });

  return (
    <div className={`bg-white rounded-2xl p-8 ${className}`}>
      <h2 className="text-3xl font-bold mb-2">Customize Your Experience</h2>
      <p className="text-gray-600 mb-8">Set your preferences</p>

      <div className="space-y-6 mb-8">
        <div>
          <label className="block font-medium mb-3">Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'auto'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setPreferences({ ...preferences, theme })}
                className={`p-4 border-2 rounded-lg capitalize ${preferences.theme === theme ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                  }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.notifications}
              onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">Enable Notifications</div>
              <div className="text-sm text-gray-600">Get updates about your progress</div>
            </div>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.weeklyReport}
              onChange={(e) => setPreferences({ ...preferences, weeklyReport: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">Weekly Summary Email</div>
              <div className="text-sm text-gray-600">Receive weekly progress reports</div>
            </div>
          </label>
        </div>
      </div>

      <button
        onClick={() => onNext(preferences)}
        className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Continue
      </button>
    </div>
  );
};

export default PreferencesStep;
