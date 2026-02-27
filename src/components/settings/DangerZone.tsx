'use client';

import React, { useState } from 'react';

interface DangerZoneProps {
  className?: string;
}

export const DangerZone: React.FC<DangerZoneProps> = ({
  className = '',
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className={`bg-white border-2 border-red-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-red-600 mb-6">Danger Zone</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
          <div>
            <div className="font-semibold text-gray-900">Delete All Data</div>
            <div className="text-sm text-gray-600">Permanently delete all your tracker data</div>
          </div>
          <button className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
            Delete Data
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
          <div>
            <div className="font-semibold text-gray-900">Delete Account</div>
            <div className="text-sm text-gray-600">Permanently delete your account and all data</div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Delete Account?</h3>
            <p className="text-gray-600 mb-6">This action cannot be undone. All your data will be permanently deleted.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DangerZone;
