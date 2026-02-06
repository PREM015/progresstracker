'use client';

import { useState, useEffect } from 'react';

export function PlatformDetail({ platformId }: { platformId: string }) {
    const [platform, setPlatform] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlatform();
    }, [platformId]);

    const fetchPlatform = async () => {
        try {
            const res = await fetch(`/api/admin/platforms/${platformId}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setPlatform(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading platform details...</div>;
    }

    if (!platform) {
        return <div className="p-8 text-center text-red-400">Platform not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{platform.name}</h2>
                        <p className="text-zinc-400">{platform.category}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${platform.isActive ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'
                        }`}>
                        {platform.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Connected Users</div>
                    <div className="text-3xl font-bold text-white">{platform._count?.userPlatforms || 0}</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Sync Status</div>
                    <div className="text-3xl font-bold text-green-400">{platform.syncStatus}</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="text-sm text-zinc-500 mb-2">Last Sync</div>
                    <div className="text-white">
                        {platform.lastSyncAt ? new Date(platform.lastSyncAt).toLocaleString() : 'Never'}
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Platform Information</h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Created</span>
                        <span className="text-white">{new Date(platform.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Updated</span>
                        <span className="text-white">{new Date(platform.updatedAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PlatformDetail;
