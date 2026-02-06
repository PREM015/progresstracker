'use client';

import React, { useState } from 'react';

interface SecuritySettingsProps {
  className?: string;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  className = '',
}) => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h3>

      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Change Password</h4>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Current password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="password"
              placeholder="New password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Update Password
            </button>
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h4>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium text-gray-900">Enable 2FA</div>
              <div className="text-sm text-gray-600">Add an extra layer of security to your account</div>
            </div>
          </label>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Active Sessions</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Current Session</div>
                <div className="text-sm text-gray-600">Chrome on Windows • Last active now</div>
              </div>
              <span className="text-green-600 text-sm font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
