'use client';

import { useState, useEffect } from 'react';

interface Platform {
    id: string;
    name: string;
    category: string;
    isActive: boolean;
    syncStatus: string;
    lastSyncAt: string | null;
    _count: {
        userPlatforms: number;
    };
}

export function PlatformsList() {
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPlatforms();
    }, []);

    const fetchPlatforms = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/platforms');
            if (!res.ok) throw new Error('Failed to fetch platforms');
            const data = await res.json();
            setPlatforms(data.platforms || []);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const togglePlatform = async (platformId: string, isActive: boolean) => {
        try {
            const res = await fetch(`/api/admin/platforms/${platformId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !isActive }),
            });
            if (!res.ok) throw new Error('Failed to update platform');
            fetchPlatforms();
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
                <div className="text-red-400">{error}</div>
                <button
                    onClick={fetchPlatforms}
                    className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                    Retry
                </button>
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
                            onClick={() => togglePlatform(platform.id, platform.isActive)}
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
                            <span className="text-white font-medium">{platform._count.userPlatforms}</span>
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
