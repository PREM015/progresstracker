"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ConnectPlatformPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const platform = searchParams?.get('platform');

  const [platformInfo, setPlatformInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [formData, setFormData] = useState({ username: '', apiKey: '' });

  useEffect(() => {
    if (platform) {
      fetch(`/api/platforms/${platform}`)
        .then(r => r.json())
        .then(data => setPlatformInfo(data.platform))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [platform]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);

    try {
      const response = await fetch('/api/platforms/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId: platform, ...formData }),
      });

      if (response.ok) {
        router.push('/platforms');
      }
    } catch (error) {
      console.error('Failed to connect platform:', error);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!platformInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">❌</span>
          <p className="mt-4 text-gray-500">Platform not found</p>
          <a href="/platforms" className="mt-4 text-indigo-600 hover:underline">Back to Platforms</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{platformInfo.icon || '🌐'}</div>
            <h1 className="text-3xl font-bold">Connect {platformInfo.name}</h1>
            <p className="text-gray-600 mt-2">{platformInfo.description}</p>
          </div>

          <form onSubmit={handleConnect} className="space-y-6">
            {platformInfo.authType === 'OAUTH' ? (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">You'll be redirected to {platformInfo.name} to authorize this connection</p>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : `Connect with ${platformInfo.name}`}
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    required
                  />
                </div>

                {platformInfo.authType === 'API_KEY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Find your API key in your {platformInfo.name} account settings
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={connecting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
