'use client';

import React, { useState } from 'react';

interface PlatformSettingsProps {
  platformId: string;
  platformName: string;
  className?: string;
}

interface Settings {
  syncFrequency: 'hourly' | 'daily' | 'weekly';
  autoSync: boolean;
  notifications: boolean;
  dataRetention: number;
}

export const PlatformSettings: React.FC<PlatformSettingsProps> = ({
  platformId,
  platformName,
  className = '',
}) => {
  const [settings, setSettings] = useState<Settings>({
    syncFrequency: 'daily',
    autoSync: true,
    notifications: true,
    dataRetention: 90,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/platforms/${platformId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">{platformName} Settings</h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sync Frequency</label>
          <select
            value={settings.syncFrequency}
            onChange={(e) => setSettings({ ...settings, syncFrequency: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="hourly">Every Hour</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoSync}
              onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium text-gray-900">Auto-sync</div>
              <div className="text-sm text-gray-600">Automatically sync data in the background</div>
            </div>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium text-gray-900">Notifications</div>
              <div className="text-sm text-gray-600">Receive notifications for sync updates</div>
            </div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Retention (days)
          </label>
          <input
            type="number"
            value={settings.dataRetention}
            onChange={(e) => setSettings({ ...settings, dataRetention: parseInt(e.target.value) })}
            min={1}
            max={365}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Data older than this will be automatically deleted
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default PlatformSettings;
