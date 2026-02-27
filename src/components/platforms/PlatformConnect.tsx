'use client';

import React, { useState } from 'react';

interface PlatformConnectProps {
  platformId: string;
  platformName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const PlatformConnect: React.FC<PlatformConnectProps> = ({
  platformId,
  platformName,
  onSuccess,
  onCancel,
  className = '',
}) => {
  const [credentials, setCredentials] = useState({ username: '', apiKey: '', token: '' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const res = await fetch(`/api/platforms/${platformId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, action: 'connect' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Connection failed');
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        Connect {platformName}
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
              {s}
            </div>
            {s < 3 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 1 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Step 1: Platform Credentials</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Your platform username"
            />
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!credentials.username}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Step 2: API Authentication</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Key / Token</label>
            <input
              type="password"
              value={credentials.apiKey}
              onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter API key"
            />
            <p className="text-xs text-gray-500 mt-2">
              Find your API key in your {platformName} account settings
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!credentials.apiKey}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Step 3: Confirm Connection</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Platform:</span>
              <span className="font-medium">{platformName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Username:</span>
              <span className="font-medium">{credentials.username}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Platform'}
            </button>
          </div>
        </div>
      )}

      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full mt-4 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default PlatformConnect;
