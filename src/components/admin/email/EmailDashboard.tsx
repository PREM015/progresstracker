import { useAdminEmailStats } from '@/hooks/useAdminCommunication';

export function EmailDashboard() {
    const { stats, isLoading: loading } = useAdminEmailStats();

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading email stats...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Sent</div>
                <div className="text-3xl font-bold text-white">{stats?.sent || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Opened</div>
                <div className="text-3xl font-bold text-green-400">{stats?.opened || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Clicked</div>
                <div className="text-3xl font-bold text-blue-400">{stats?.clicked || 0}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-500 mb-2">Bounced</div>
                <div className="text-3xl font-bold text-red-400">{stats?.bounced || 0}</div>
            </div>
        </div>
    );
}

export default EmailDashboard;
