'use client';

import { useState, useEffect } from 'react';

interface BillingStats {
    totalRevenue: number;
    activeSubscriptions: number;
    mrr: number;
    churnRate: number;
    lifetimeValue: number;
    pendingPayments: number;
    failedPayments: number;
    revenueGrowth: number;
}

export function BillingDashboard() {
    const [data, setData] = useState<BillingStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

    useEffect(() => {
        fetchBillingData();
    }, [period]);

    const fetchBillingData = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/billing?period=${period}`);
            if (!res.ok) throw new Error('Failed to fetch billing data');

            const billingData = await res.json();
            setData(billingData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-600">{error || 'No billing data available'}</p>
                <button
                    onClick={fetchBillingData}
                    className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
                >
                    Try again
                </button>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Billing Overview</h2>
                <div className="flex gap-2">
                    {(['month', 'quarter', 'year'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Revenue"
                    value={formatCurrency(data.totalRevenue)}
                    change={data.revenueGrowth}
                    trend={data.revenueGrowth > 0 ? 'up' : 'down'}
                    icon="💰"
                />
                <StatCard
                    label="Active Subscriptions"
                    value={data.activeSubscriptions.toString()}
                    icon="👥"
                />
                <StatCard
                    label="Monthly Recurring Revenue"
                    value={formatCurrency(data.mrr)}
                    icon="📊"
                />
                <StatCard
                    label="Churn Rate"
                    value={`${data.churnRate.toFixed(2)}%`}
                    trend={data.churnRate > 5 ? 'down' : 'up'}
                    icon="📉"
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Lifetime Value</span>
                        <span className="text-2xl">💎</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(data.lifetimeValue)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Average per customer</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Pending Payments</span>
                        <span className="text-2xl">⏳</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                        {data.pendingPayments}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Failed Payments</span>
                        <span className="text-2xl">❌</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                        {data.failedPayments}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Requires attention</p>
                </div>
            </div>
        </div>
    );
}

interface StatCardProps {
    label: string;
    value: string;
    change?: number;
    trend?: 'up' | 'down';
    icon: string;
}

function StatCard({ label, value, change, trend, icon }: StatCardProps) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">{label}</span>
                <span className="text-2xl">{icon}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            {change !== undefined && (
                <div className={`text-sm mt-2 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {trend === 'up' ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs last period
                </div>
            )}
        </div>
    );
}

export default BillingDashboard;
