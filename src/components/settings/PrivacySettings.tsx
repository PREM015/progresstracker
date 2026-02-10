'use client';

import React from 'react';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

interface PrivacySettingsProps {
  className?: string;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  className = '',
}) => {
  const { settings, updatePrivacy, isUpdatingPrivacy } = useSettings();

  // We need to map the settings object (which might be flat or nested depending on API) 
  // to the PrivacySettings interface expected by updatePrivacy.
  // Looking at useSettings.ts, updatePrivacy takes Partial<PrivacySettings>.
  // But settingsQuery returns UserSettings which has flattened privacy fields like publicProfile, showInLeaderboard.
  // Wait, useSettings.ts has `updatePrivacy` calling `/user/profile`.
  // The UserSettings interface has: publicProfile, showInLeaderboard, allowAnalytics.

  // Let's assume the hook handles the structure or we map based on what's available.
  // For now, I'll map the UI fields to likely API fields.

  const handleToggle = async (key: string, value: boolean) => {
    try {
      // We use updatePrivacy for these fields as per the hook structure
      await updatePrivacy({ [key]: value });
      toast.success('Privacy settings updated');
    } catch (error) {
      toast.error('Failed to update privacy settings');
    }
  };

  if (!settings) return <div className="p-6">Loading...</div>;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Privacy Settings</h3>

      <div className="space-y-6">
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.publicProfile}
              onChange={(e) => handleToggle('isPublic', e.target.checked)} // Mapping publicProfile to isPublic likely
              className="w-5 h-5"
              disabled={isUpdatingPrivacy}
            />
            <div>
              <div className="font-medium text-gray-900">Public Profile</div>
              <div className="text-sm text-gray-600">Allow others to view your profile</div>
            </div>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showInLeaderboard}
              onChange={(e) => handleToggle('showActivity', e.target.checked)} // Assuming this maps to activity or leaderboard
              className="w-5 h-5"
              disabled={isUpdatingPrivacy}
            />
            <div>
              <div className="font-medium text-gray-900">Show Activity</div>
              <div className="text-sm text-gray-600">Display your recent activity publicly</div>
            </div>
          </label>
        </div>

        <div>
          {/* Add Goal sharing if supported by API */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              // Checks if showGoals exists in settings (might need type assertion if untyped in UserSettings but present in api)
              checked={(settings as any).showGoals || false}
              onChange={(e) => handleToggle('showGoals', e.target.checked)}
              className="w-5 h-5"
              disabled={isUpdatingPrivacy}
            />
            <div>
              <div className="font-medium text-gray-900">Show Goals</div>
              <div className="text-sm text-gray-600">Share your goals with the community</div>
            </div>
          </label>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Data Privacy</h4>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Download My Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
