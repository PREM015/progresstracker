'use client';

import { useState, useEffect } from 'react';

interface EngagementData {
    dau: number;
    wau: number;
    mau: number;
    sessionsPerUser: number;
    actionsPerSession: number;
    avgSessionDuration: number;
    bounceRate: number;
    returnRate: number;
}

export function EngagementMetrics() {
    const [metrics, setMetrics] = useState<EngagementData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/analytics/engagement');
            if (!res.ok) throw new Error('Failed to fetch engagement metrics');

            const data = await res.json();
            setMetrics(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-20 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !metrics) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-600">{error || 'No engagement data available'}</p>
                <button
                    onClick={fetchMetrics}
                    className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Engagement Metrics</h3>
                <button
                    onClick={fetchMetrics}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* DAU */}
                <MetricCard
                    label="Daily Active Users"
                    value={metrics.dau.toLocaleString()}
                    icon="📅"
                    color="green"
                />

                {/* WAU */}
                <MetricCard
                    label="Weekly Active Users"
                    value={metrics.wau.toLocaleString()}
                    icon="📊"
                    color="blue"
                />

                {/* MAU */}
                <MetricCard
                    label="Monthly Active Users"
                    value={metrics.mau.toLocaleString()}
                    icon="📈"
                    color="purple"
                />

                {/* Sessions Per User */}
                <MetricCard
                    label="Sessions Per User"
                    value={metrics.sessionsPerUser.toFixed(1)}
                    icon="🔄"
                    color="indigo"
                />

                {/* Actions Per Session */}
                <MetricCard
                    label="Actions Per Session"
                    value={metrics.actionsPerSession.toFixed(1)}
                    icon="⚡"
                    color="yellow"
                />

                {/* Avg Session Duration */}
                <MetricCard
                    label="Avg Session Duration"
                    value={`${Math.floor(metrics.avgSessionDuration / 60)}m ${metrics.avgSessionDuration % 60}s`}
                    icon="⏱️"
                    color="pink"
                />

                {/* Bounce Rate */}
                <MetricCard
                    label="Bounce Rate"
                    value={`${metrics.bounceRate.toFixed(1)}%`}
                    icon="↩️"
                    color="red"
                    isNegative={true}
                />

                {/* Return Rate */}
                <MetricCard
                    label="Return Rate"
                    value={`${metrics.returnRate.toFixed(1)}%`}
                    icon="🔁"
                    color="teal"
                />

                {/* Stickiness (DAU/MAU) */}
                <MetricCard
                    label="Stickiness Ratio"
                    value={`${((metrics.dau / metrics.mau) * 100).toFixed(1)}%`}
                    icon="🎯"
                    color="orange"
                    subtitle="DAU / MAU"
                />
            </div>
        </div>
    );
}

interface MetricCardProps {
    label: string;
    value: string;
    icon: string;
    color: string;
    isNegative?: boolean;
    subtitle?: string;
}

function MetricCard({ label, value, icon, color, isNegative, subtitle }: MetricCardProps) {
    const colorMap: Record<string, string> = {
        green: 'bg-green-50 border-green-200',
        blue: 'bg-blue-50 border-blue-200',
        purple: 'bg-purple-50 border-purple-200',
        indigo: 'bg-indigo-50 border-indigo-200',
        yellow: 'bg-yellow-50 border-yellow-200',
        pink: 'bg-pink-50 border-pink-200',
        red: 'bg-red-50 border-red-200',
        teal: 'bg-teal-50 border-teal-200',
        orange: 'bg-orange-50 border-orange-200',
    };

    return (
        <div className={`border rounded-lg p-4 ${colorMap[color] || 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-xl">{icon}</span>
            </div>
            <div className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                {value}
            </div>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
}

export default EngagementMetrics;
