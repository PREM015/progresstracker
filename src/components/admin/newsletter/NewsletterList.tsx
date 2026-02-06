'use client';

import { useState, useEffect } from 'react';

interface Newsletter {
    id: string;
    email: string;
    isActive: boolean;
    isConfirmed: boolean;
    topics: string[];
    subscribedAt: string;
    unsubscribedAt: string | null;
}

interface NewsletterStats {
    total: number;
    active: number;
    confirmed: number;
    unconfirmed: number;
}

export function NewsletterList() {
    const [subscribers, setSubscribers] = useState<Newsletter[]>([]);
    const [stats, setStats] = useState<NewsletterStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchData();
    }, [page]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subsRes, statsRes] = await Promise.all([
                fetch(`/api/admin/newsletter?page=${page}&limit=50`),
                fetch('/api/admin/newsletter/stats'),
            ]);

            if (subsRes.ok) {
                const subsData = await subsRes.json();
                setSubscribers(subsData.subscribers || subsData || []);
            }

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async (id: string, email: string) => {
        if (!confirm(`Unsubscribe ${email}?`)) return;

        try {
            const res = await fetch(`/api/admin/newsletter/${id}/unsubscribe`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to unsubscribe');
            fetchData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-500 mb-2">Total Subscribers</div>
                        <div className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-500 mb-2">Active</div>
                        <div className="text-3xl font-bold text-green-400">{stats.active.toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-500 mb-2">Confirmed</div>
                        <div className="text-3xl font-bold text-blue-400">{stats.confirmed.toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-500 mb-2">Unconfirmed</div>
                        <div className="text-3xl font-bold text-yellow-400">{stats.unconfirmed.toLocaleString()}</div>
                    </div>
                </div>
            )}

            {/* Subscribers Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Email</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Topics</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Subscribed</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : subscribers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                                        No subscribers found
                                    </td>
                                </tr>
                            ) : (
                                subscribers.map((sub) => (
                                    <tr key={sub.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-4 text-white">{sub.email}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${sub.isActive ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'
                                                    }`}>
                                                    {sub.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${sub.isConfirmed ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {sub.isConfirmed ? 'Confirmed' : 'Unconfirmed'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-1">
                                                {sub.topics.length > 0 ? (
                                                    sub.topics.map((topic) => (
                                                        <span key={topic} className="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400">
                                                            {topic}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-zinc-500 text-sm">All</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-zinc-400">
                                            {new Date(sub.subscribedAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            {sub.isActive && (
                                                <button
                                                    onClick={() => unsubscribe(sub.id, sub.email)}
                                                    className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                                >
                                                    Unsubscribe
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-2 p-4 border-t border-zinc-800">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-zinc-400">Page {page}</span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={subscribers.length < 50}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NewsletterList;
