'use client';

import React from 'react';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

interface AppearanceSettingsProps {
  className?: string;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  className = '',
}) => {
  const { settings, theme, updateSettings, isUpdating } = useSettings() as any; // Cast for now if types not synced
  const fontSize = settings?.fontSize;

  const handleUpdate = async (key: string, value: any) => {
    try {
      await updateSettings({ [key]: value });
      toast.success('Settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Appearance Settings</h3>

      <div className="space-y-6">
        <div>
          <label className="block font-medium mb-3">Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleUpdate('theme', t)}
                disabled={isUpdating}
                className={`p-4 border-2 rounded-lg capitalize ${theme === t ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'} ${isUpdating ? 'opacity-50' : ''}`}
              >
                {t === 'light' && '☀️'} {t === 'dark' && '🌙'} {t === 'system' && '⚙️'} {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-3">Font Size</label>
          <select
            value={fontSize || 'medium'}
            onChange={(e) => handleUpdate('fontSize', e.target.value)}
            disabled={isUpdating}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        {/* Note: Save is automatic on change for these, or we can add a manual save if preferred. 
            The hook supports immediate update. 
        */}
      </div>
    </div>
  );
};

export default AppearanceSettings;
