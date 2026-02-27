'use client';

import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';

export function PlatformsList() {
    const { platforms, isLoading: loading, error, togglePlatform } = useAdminPlatforms();

    const handleTogglePlatform = async (platformId: string, isActive: boolean) => {
        try {
            await togglePlatform(platformId, !isActive);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                <div className="text-center text-zinc-500">Loading platforms...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <div className="text-red-400">Error loading platforms</div>
                <div className="text-sm text-zinc-500 mt-2">{(error as any)?.message || 'Unknown error'}</div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((platform) => (
                <div key={platform.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white">{platform.name}</h3>
                            <p className="text-sm text-zinc-500">{platform.category}</p>
                        </div>
                        <button
                            onClick={() => handleTogglePlatform(platform.id, platform.isActive)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${platform.isActive
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                                }`}
                        >
                            {platform.isActive ? 'Active' : 'Inactive'}
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Connected Users</span>
                            <span className="text-white font-medium">{platform._count?.userPlatforms ?? 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Sync Status</span>
                            <span className={`font-medium ${platform.syncStatus === 'ACTIVE' ? 'text-green-400' : 'text-zinc-400'
                                }`}>
                                {platform.syncStatus}
                            </span>
                        </div>
                        {platform.lastSyncAt && (
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Last Sync</span>
                                <span className="text-white font-medium">
                                    {new Date(platform.lastSyncAt).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default PlatformsList;
