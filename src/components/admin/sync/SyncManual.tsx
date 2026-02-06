'use client';

import { useState } from 'react';

export function SyncManual({ platformId }: { platformId?: string }) {
    const [syncing, setSyncing] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState(platformId || '');

    const triggerSync = async () => {
        if (!selectedPlatform && !platformId) {
            alert('Please select a platform');
            return;
        }

        if (!confirm('Trigger manual sync?')) return;

        setSyncing(true);
        try {
            const res = await fetch('/api/admin/sync/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platformId: platformId || selectedPlatform }),
            });

            if (!res.ok) throw new Error('Failed to trigger sync');
            const data = await res.json();
            alert(`Sync triggered! Job ID: ${data.jobId}`);
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Manual Sync</h3>

            {!platformId && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Select Platform</label>
                    <select
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                    >
                        <option value="">Choose a platform...</option>
                        <option value="all">All Platforms</option>
                        {/* Platform options would be loaded from API */}
                    </select>
                </div>
            )}

            <button
                onClick={triggerSync}
                disabled={syncing}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
                {syncing ? 'Syncing...' : 'Trigger Sync Now'}
            </button>

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="text-yellow-400 text-sm">
                    ⚠️ Manual syncs may take several minutes to complete. You'll be notified when finished.
                </div>
            </div>
        </div>
    );
}

export default SyncManual;
