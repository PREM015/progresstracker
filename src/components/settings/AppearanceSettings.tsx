'use client';

import React, { useState } from 'react';

interface AppearanceSettingsProps {
  className?: string;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  className = '',
}) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [fontSize, setFontSize] = useState('medium');

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Appearance Settings</h3>

      <div className="space-y-6">
        <div>
          <label className="block font-medium mb-3">Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'auto'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`p-4 border-2 rounded-lg capitalize ${theme === t ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                  }`}
              >
                {t === 'light' && '☀️'} {t === 'dark' && '🌙'} {t === 'auto' && '⚙️'} {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-3">Font Size</label>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <button className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Save Preferences
        </button>
      </div>
    </div>
  );
};

export default AppearanceSettings;
