'use client';

import React from 'react';

interface PrivacySettingsProps {
  className?: string;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  className = '',
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Privacy Settings</h3>

      <div className="space-y-6">
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-5 h-5" />
            <div>
              <div className="font-medium text-gray-900">Public Profile</div>
              <div className="text-sm text-gray-600">Allow others to view your profile</div>
            </div>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-5 h-5" />
            <div>
              <div className="font-medium text-gray-900">Show Activity</div>
              <div className="text-sm text-gray-600">Display your recent activity publicly</div>
            </div>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-5 h-5" />
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
