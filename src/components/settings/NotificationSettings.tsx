'use client';

import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = '',
}) => {
  const { preferences, updatePreferences, isLoadingPreferences } = useNotifications();
  const [localPrefs, setLocalPrefs] = useState({
    email: true,
    push: false,
    goals: true,
    achievements: true,
    sync: false,
    weekly: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        email: preferences.email ?? true,
        push: preferences.push ?? false,
        goals: preferences.goals ?? true,
        achievements: preferences.achievements ?? true,
        sync: preferences.sync ?? false,
        weekly: preferences.weekly ?? true,
      });
    }
  }, [preferences]);


  const handleSave = async () => {
    if (!updatePreferences) return;
    setIsSaving(true);
    try {
      await updatePreferences(localPrefs);
      toast.success('Notification preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingPreferences) {
    return <div className={`p-6 bg-white border rounded-xl space-y-4 ${className}`}>
      <div className="h-8 w-1/3 bg-gray-100 animate-pulse rounded" />
      <div className="h-64 bg-gray-100 animate-pulse rounded" />
    </div>;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Notification Settings</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Channels</h4>
          <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={localPrefs.email}
              onChange={(e) => setLocalPrefs({ ...localPrefs, email: e.target.checked })}
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
              checked={localPrefs.push}
              onChange={(e) => setLocalPrefs({ ...localPrefs, push: e.target.checked })}
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
                checked={localPrefs[item.key as keyof typeof localPrefs]}
                onChange={(e) => setLocalPrefs({ ...localPrefs, [item.key]: e.target.checked })}
                className="w-5 h-5"
              />
              <div>
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-600">{item.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
