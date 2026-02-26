'use client';

import { useAdminEmailStats } from '@/hooks/useAdminCommunication';

export function EmailStats() {
    const { stats, isLoading: loading } = useAdminEmailStats();

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Email Performance</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-zinc-500 text-sm">Open Rate</div>
                    <div className="text-xl font-bold text-white">
                        {stats?.sent ? Math.round((stats.opened / stats.sent) * 100) : 0}%
                    </div>
                </div>
                <div>
                    <div className="text-zinc-500 text-sm">Click Rate</div>
                    <div className="text-xl font-bold text-white">
                        {stats?.sent ? Math.round((stats.clicked / stats.sent) * 100) : 0}%
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmailStats;
