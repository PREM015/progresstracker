'use client';

import { useState } from 'react';
import { useAdminAnalytics, TimeFrame } from '@/hooks/useAdminAnalytics';

interface MetricCardProps {
    title: string;
    value: string;
    change?: number;
    subtitle?: string;
    icon: string;
}

function MetricCard({ title, value, change, subtitle, icon }: MetricCardProps) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">{title}</span>
                <span className="text-2xl">{icon}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            {change !== undefined && (
                <div className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% this period
                </div>
            )}
            {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
        </div>
    );
}

export function AdminAnalyticsDashboard() {
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('30d');
    const { data, isLoading: loading, error, refetch } = useAdminAnalytics(timeFrame);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64 bg-gray-100 rounded-xl"></div>
                    <div className="h-64 bg-gray-100 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-600">{(error as any)?.message || 'No analytics data available'}</p>
                <button
                    onClick={() => refetch()}
                    className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
                <div className="flex gap-2">
                    {(['7d', '30d', '90d'] as const).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeFrame(tf)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeFrame === tf
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Last {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Users"
                    value={data.users.toLocaleString()}
                    change={data.usersGrowth}
                    icon="👥"
                />
                <MetricCard
                    title="Active Users"
                    value={data.activeUsers.toLocaleString()}
                    subtitle={`${data.activeRate}% active rate`}
                    icon="✨"
                />
                <MetricCard
                    title="Revenue"
                    value={`$${data.revenue.toLocaleString()}`}
                    change={data.revenueGrowth}
                    icon="💰"
                />
                <MetricCard
                    title="New Signups"
                    value={data.newSignups.toLocaleString()}
                    change={data.signupsGrowth}
                    icon="🚀"
                />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="text-sm font-medium text-gray-600 mb-2">Retention Rate</div>
                    <div className="text-3xl font-bold text-gray-900">{data.retentionRate}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${data.retentionRate}%` }}
                        />
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="text-sm font-medium text-gray-600 mb-2">Avg Session Duration</div>
                    <div className="text-3xl font-bold text-gray-900">
                        {Math.floor(data.avgSessionDuration / 60)}m {data.avgSessionDuration % 60}s
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Per user session</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
                    <div className="text-sm font-medium opacity-90 mb-2">Refresh Analytics</div>
                    <button
                        onClick={() => refetch()}
                        className="w-full mt-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Top Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Platforms */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Top Platforms</h3>
                    <div className="space-y-3">
                        {data.topPlatforms.map((platform, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                                    <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                                </div>
                                <span className="text-sm text-gray-600">{platform.users} users</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Features */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Top Features</h3>
                    <div className="space-y-3">
                        {data.topFeatures.map((feature, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                                    <span className="text-sm font-medium text-gray-900">{feature.name}</span>
                                </div>
                                <span className="text-sm text-gray-600">{feature.usage}% usage</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminAnalyticsDashboard;
