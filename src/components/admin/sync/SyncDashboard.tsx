'use client';

import { useAdminSync } from '@/hooks/useAdminSync';

export function SyncDashboard() {
    const { status: syncData, isLoadingStatus: loading } = useAdminSync();

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading sync status...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Active Syncs</div>
                    <div className="text-3xl font-bold text-blue-400">{syncData?.activeSyncs || 0}</div>
                    <div className="text-xs text-blue-500 mt-1">Currently running</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Success Rate</div>
                    <div className="text-3xl font-bold text-green-400">{syncData?.successRate || 0}%</div>
                    <div className="text-xs text-zinc-600 mt-1">Last 24 hours</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Last Sync</div>
                    <div className="text-white text-lg">
                        {syncData?.lastSync ? new Date(syncData.lastSync).toLocaleTimeString() : 'Never'}
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">System-wide</div>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Platform Sync Status</h3>
                <div className="space-y-3">
                    {syncData?.platformStatus?.map((platform: { id: string; name: string; status: string; lastSync: Date | string | null }) => (
                        <div key={platform.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${platform.status === 'ACTIVE' ? 'bg-green-400' :
                                    platform.status === 'SYNCING' ? 'bg-blue-400 animate-pulse' :
                                        'bg-yellow-400'
                                    }`} />
                                <span className="text-white font-medium">{platform.name}</span>
                            </div>
                            <div className="text-zinc-400 text-sm">
                                {platform.lastSync ? new Date(platform.lastSync).toLocaleString() : 'No sync yet'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SyncDashboard;
