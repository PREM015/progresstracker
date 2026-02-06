'use client';

import { useState } from 'react';

export function SyncSchedule() {
    const [schedule, setSchedule] = useState({
        enabled: true,
        interval: '1h',
        platforms: [] as string[],
    });
    const [saving, setSaving] = useState(false);

    const saveSchedule = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/sync/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(schedule),
            });

            if (!res.ok) throw new Error('Failed to save');
            alert('Sync schedule updated!');
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sync Schedule</h3>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="scheduleEnabled"
                        checked={schedule.enabled}
                        onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
                        className="w-4 h-4"
                    />
                    <label htmlFor="scheduleEnabled" className="text-white">Enable Automatic Sync</label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Sync Interval</label>
                    <select
                        value={schedule.interval}
                        onChange={(e) => setSchedule({ ...schedule, interval: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                        disabled={!schedule.enabled}
                    >
                        <option value="15m">Every 15 minutes</option>
                        <option value="30m">Every 30 minutes</option>
                        <option value="1h">Every hour</option>
                        <option value="6h">Every 6 hours</option>
                        <option value="12h">Every 12 hours</option>
                        <option value="24h">Once daily</option>
                    </select>
                </div>

                <button
                    onClick={saveSchedule}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Schedule'}
                </button>
            </div>
        </div>
    );
}

export default SyncSchedule;
