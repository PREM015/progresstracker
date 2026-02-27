'use client';

import { useState } from 'react';
import { useAdminSync } from '@/hooks/useAdminSync';

export function SyncManual({ platformId }: { platformId?: string }) {
    const { triggerSync, isSyncing: syncing } = useAdminSync();
    const [selectedPlatform, setSelectedPlatform] = useState(platformId || '');

    const handleTriggerSync = async () => {
        if (!selectedPlatform && !platformId) {
            alert('Please select a platform');
            return;
        }

        if (!confirm('Trigger manual sync?')) return;

        try {
            // Note: SyncManual originally used { platformId } body.
            // SyncControl uses { type, platformId }.
            // I should verify if triggerSync supports generic object body.
            // In hook: mutationFn: (data: any) => post(..., data).
            // So I can pass { platformId: ... } directly if allowed by API.
            // Or use { type: 'platform', platformId: ... } if I want to align with SyncControl pattern
            // but the original SyncManual just sent { platformId }.
            // I will send what original sent to be safe unless API unified.
            const res = await triggerSync({ platformId: platformId || selectedPlatform });
            alert(`Sync triggered! Job ID: ${res.data?.jobId}`);
        } catch (err: any) {
            alert('Error: ' + err.message);
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
                onClick={handleTriggerSync}
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
