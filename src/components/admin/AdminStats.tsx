'use client';

import { useState, useEffect } from 'react';

interface AdminStatsData {
    users: { total: number; active: number; newToday: number };
    platforms: { total: number; active: number };
    goals: { total: number; completed: number };
    revenue: { total: number; monthly: number };
}

export function AdminStats() {
    const [stats, setStats] = useState<AdminStatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
                        <div className="h-4 bg-zinc-800 rounded w-1/2 mb-3" />
                        <div className="h-8 bg-zinc-800 rounded w-3/4" />
                    </div>
                ))}
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Users',
            value: stats?.users.total || 0,
            sub: `${stats?.users.active || 0} active`,
            color: 'text-blue-400',
            icon: '👥',
        },
        {
            label: 'Platforms',
            value: stats?.platforms.total || 0,
            sub: `${stats?.platforms.active || 0} active`,
            color: 'text-green-400',
            icon: '🔌',
        },
        {
            label: 'Goals',
            value: stats?.goals.total || 0,
            sub: `${stats?.goals.completed || 0} completed`,
            color: 'text-purple-400',
            icon: '🎯',
        },
        {
            label: 'Revenue',
            value: `$${(stats?.revenue.monthly || 0).toLocaleString()}`,
            sub: 'Monthly',
            color: 'text-yellow-400',
            icon: '💰',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card) => (
                <div key={card.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="text-sm text-zinc-500">{card.label}</div>
                        <div className="text-2xl">{card.icon}</div>
                    </div>
                    <div className={`text-3xl font-bold ${card.color} mb-1`}>
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                    </div>
                    <div className="text-xs text-zinc-600">{card.sub}</div>
                </div>
            ))}
        </div>
    );
}

export default AdminStats;
