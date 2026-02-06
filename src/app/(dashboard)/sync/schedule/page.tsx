"use client";

import { useState, useEffect } from "react";

export default function SyncSchedulePage() {
  const [schedule, setSchedule] = useState({
    enabled: false,
    frequency: 'DAILY',
    time: '00:00',
    platforms: [] as string[],
  });
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/sync/schedule').then(r => r.json()),
      fetch('/api/platforms').then(r => r.json())
    ])
      .then(([scheduleData, platformsData]) => {
        if (scheduleData.schedule) setSchedule(scheduleData.schedule);
        setPlatforms(platformsData.platforms || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/sync/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Sync Schedule</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Automatic Sync</h3>
                <p className="text-sm text-gray-600">Automatically sync platforms on schedule</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {schedule.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <select
                    value={schedule.frequency}
                    onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="HOURLY">Every Hour</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platforms to Sync</label>
                  <div className="space-y-2">
                    {platforms.map(platform => (
                      <label key={platform.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={schedule.platforms.includes(platform.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSchedule({ ...schedule, platforms: [...schedule.platforms, platform.id] });
                            } else {
                              setSchedule({ ...schedule, platforms: schedule.platforms.filter(id => id !== platform.id) });
                            }
                          }}
                          className="rounded"
                        />
                        <span>{platform.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
