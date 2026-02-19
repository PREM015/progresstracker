import { useMemo, useState } from 'react';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntry } from '@/types/tracker';
import { formatTimeSpent } from '@/types/tracker';

interface TrackerTrendsProps {
    userId?: string;
    period?: 'week' | 'month' | 'quarter' | 'year';
    className?: string;
}

interface TrendData {
    date: string;
    problems: number;
    commits: number;
    time: number;
    points: number;
}

export function TrackerTrends({ userId, period = 'month', className = '' }: TrackerTrendsProps) {
    const [selectedMetric, setSelectedMetric] = useState<'problems' | 'commits' | 'time' | 'points'>('problems');

    const filters = useMemo(() => {
        const { start, end } = getPeriodDates(period);
        return { startDate: start, endDate: end, limit: 1000 };
    }, [period]);

    const { entries, isLoading, error } = useTracker(filters);

    const trends = useMemo(() => {
        if (!entries) return [];
        return groupByDate(entries);
    }, [entries]);

    const groupByDate = (entries: TrackerEntry[]): TrendData[] => {
        const map = new Map<string, TrendData>();

        entries.forEach(entry => {
            const dateKey = new Date(entry.date).toISOString().split('T')[0];
            const existing = map.get(dateKey) || { date: dateKey, problems: 0, commits: 0, time: 0, points: 0 };

            existing.problems += entry.problemsSolved;
            existing.commits += entry.commits;
            existing.time += entry.timeSpent;
            existing.points += entry.points || 0;

            map.set(dateKey, existing);
        });

        return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    };

    const getMaxValue = () => {
        return Math.max(...trends.map(t => t[selectedMetric]), 1);
    };

    if (isLoading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-80 bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-50 border border-red-200 rounded-xl p-6 ${className}`}>
                <p className="text-red-600">Failed to load trend data</p>
            </div>
        );
    }

    const maxValue = getMaxValue();

    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Trends</h2>

                {/* Metric Selector */}
                <div className="flex gap-2">
                    <MetricButton
                        label="Problems"
                        isActive={selectedMetric === 'problems'}
                        onClick={() => setSelectedMetric('problems')}
                    />
                    <MetricButton
                        label="Commits"
                        isActive={selectedMetric === 'commits'}
                        onClick={() => setSelectedMetric('commits')}
                    />
                    <MetricButton
                        label="Time"
                        isActive={selectedMetric === 'time'}
                        onClick={() => setSelectedMetric('time')}
                    />
                    <MetricButton
                        label="Points"
                        isActive={selectedMetric === 'points'}
                        onClick={() => setSelectedMetric('points')}
                    />
                </div>
            </div>

            {/* Chart */}
            {trends.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No data for this period
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Simple Bar Chart */}
                    <div className="h-64 flex items-end gap-1">
                        {trends.map((trend, idx) => {
                            const value = trend[selectedMetric];
                            const percentage = (value / maxValue) * 100;

                            return (
                                <div key={idx} className="flex-1 flex flex-col justify-end" title={`${trend.date}: ${value}`}>
                                    <div
                                        className="bg-indigo-500 hover:bg-indigo-600 rounded-t transition-all cursor-pointer"
                                        style={{ height: `${percentage}%`, minHeight: value > 0 ? '4px' : '0' }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* X-Axis Labels */}
                    <div className="flex justify-between text-xs text-gray-500 pt-2">
                        <span>{trends[0]?.date && formatDateLabel(trends[0].date)}</span>
                        <span>{trends[Math.floor(trends.length / 2)]?.date && formatDateLabel(trends[Math.floor(trends.length / 2)].date)}</span>
                        <span>{trends[trends.length - 1]?.date && formatDateLabel(trends[trends.length - 1].date)}</span>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                <StatCard
                    label="Total Problems"
                    value={trends.reduce((sum, t) => sum + t.problems, 0)}
                />
                <StatCard
                    label="Total Commits"
                    value={trends.reduce((sum, t) => sum + t.commits, 0)}
                />
                <StatCard
                    label="Total Time"
                    value={formatTimeSpent(trends.reduce((sum, t) => sum + t.time, 0))}
                />
                <StatCard
                    label="Total Points"
                    value={trends.reduce((sum, t) => sum + t.points, 0)}
                />
            </div>
        </div>
    );
}

function MetricButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
        >
            {label}
        </button>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-lg font-bold text-gray-900">{value}</div>
        </div>
    );
}

function getPeriodDates(period: string): { start: Date; end: Date } {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);

    switch (period) {
        case 'week':
            start.setDate(end.getDate() - 7);
            break;
        case 'month':
            start.setDate(end.getDate() - 30);
            break;
        case 'quarter':
            start.setDate(end.getDate() - 90);
            break;
        case 'year':
            start.setDate(end.getDate() - 365);
            break;
    }

    start.setHours(0, 0, 0, 0);
    return { start, end };
}

function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default TrackerTrends;
