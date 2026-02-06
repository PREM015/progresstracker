'use client';

import React, { useState } from 'react';

interface PlatformDisconnectProps {
  platformId: string;
  platformName: string;
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

export const PlatformDisconnect: React.FC<PlatformDisconnectProps> = ({
  platformId,
  platformName,
  onSuccess,
  onCancel,
  className = '',
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [deleteData, setDeleteData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);

    try {
      const res = await fetch(`/api/platforms/${platformId}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteData }),
      });

      if (!res.ok) throw new Error('Disconnection failed');

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className={`bg-white border-2 border-red-200 rounded-2xl p-8 max-w-md mx-auto ${className}`}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Disconnect {platformName}?</h3>
        <p className="text-gray-600">
          This will stop syncing data from this platform. You can reconnect at any time.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={deleteData}
            onChange={(e) => setDeleteData(e.target.checked)}
            className="mt-1"
          />
          <div>
            <div className="font-medium text-gray-900">Delete synced data</div>
            <div className="text-sm text-gray-600">
              Permanently remove all data synced from this platform. This cannot be undone.
            </div>
          </div>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    </div>
  );
};

export default PlatformDisconnect;
