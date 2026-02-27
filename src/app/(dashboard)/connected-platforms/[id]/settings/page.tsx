"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function PlatformSettingsPage() {
  const params = useParams();
  const platformId = params.id as string;

  const [settings, setSettings] = useState({
    autoSync: true,
    syncInterval: 60,
    notifyOnSync: true,
    dataTypes: [] as string[],
  });
  const [platform, setPlatform] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/platforms/${platformId}`).then(r => r.json()),
      fetch(`/api/platforms/${platformId}/settings`).then(r => r.json())
    ])
      .then(([platformData, settingsData]) => {
        setPlatform(platformData.platform);
        if (settingsData.settings) setSettings(settingsData.settings);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [platformId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/platforms/${platformId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!platform) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🔌</span>
          <p className="mt-4 text-gray-500">Platform not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">{platform.name} Settings</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">Auto Sync</h3>
                <p className="text-sm text-gray-600">Automatically sync data from {platform.name}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSync}
                  onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {settings.autoSync && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sync Interval (minutes)</label>
                  <input
                    type="number"
                    value={settings.syncInterval}
                    onChange={(e) => setSettings({ ...settings, syncInterval: Number(e.target.value) })}
                    min="5"
                    max="1440"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Sync Notifications</h3>
                    <p className="text-sm text-gray-600">Get notified when sync completes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyOnSync}
                      onChange={(e) => setSettings({ ...settings, notifyOnSync: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
