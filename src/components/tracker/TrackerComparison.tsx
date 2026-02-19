import { useMemo, useState } from 'react';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntry } from '@/types/tracker';
import { formatTimeSpent } from '@/types/tracker';

interface ComparisonPeriod {
    label: string;
    start: Date;
    end: Date;
}

interface TrackerComparisonProps {
    userId?: string;
    comparisonType?: 'week' | 'month' | 'custom';
    className?: string;
}

interface PeriodStats {
    period: string;
    problems: number;
    commits: number;
    time: number;
    points: number;
    entries: number;
}

export function TrackerComparison({
    userId,
    comparisonType = 'week',
    className = ''
}: TrackerComparisonProps) {
    const periods = useMemo(() => getPeriods(comparisonType), [comparisonType]);

    const filters = useMemo(() => ({
        startDate: periods.previous.start.toISOString(),
        endDate: periods.current.end.toISOString(),
        limit: 2000
    }), [periods]);

    const { entries, isLoading, error } = useTracker(filters);

    const currentPeriod = useMemo(() => {
        if (!entries) return null;
        const periodEntries = entries.filter(e => {
            const d = new Date(e.date);
            return d >= periods.current.start && d <= periods.current.end;
        });
        return calculatePeriodStats(periods.current.label, periodEntries);
    }, [entries, periods.current]);

    const previousPeriod = useMemo(() => {
        if (!entries) return null;
        const periodEntries = entries.filter(e => {
            const d = new Date(e.date);
            return d >= periods.previous.start && d <= periods.previous.end;
        });
        return calculatePeriodStats(periods.previous.label, periodEntries);
    }, [entries, periods.previous]);

    const calculatePeriodStats = (label: string, entries: TrackerEntry[]): PeriodStats => {
        return {
            period: label,
            problems: entries.reduce((sum, e) => sum + e.problemsSolved, 0),
            commits: entries.reduce((sum, e) => sum + e.commits, 0),
            time: entries.reduce((sum, e) => sum + e.timeSpent, 0),
            points: entries.reduce((sum, e) => sum + (e.points || 0), 0),
            entries: entries.length,
        };
    };

    const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    if (isLoading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-64 bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    if (error || !currentPeriod || !previousPeriod) {
        return (
            <div className={`bg-red-50 border border-red-200 rounded-xl p-6 ${className}`}>
                <p className="text-red-600">Failed to load comparison data</p>
            </div>
        );
    }

    return (
        <div className={className}>
            <div className="bg-white border border-gray-200  rounded-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Period Comparison</h2>
                    <div className="text-sm text-gray-500">
                        {currentPeriod.period} vs {previousPeriod.period}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ComparisonCard
                        label="Problems Solved"
                        current={currentPeriod.problems}
                        previous={previousPeriod.problems}
                        change={calculateChange(currentPeriod.problems, previousPeriod.problems)}
                    />
                    <ComparisonCard
                        label="Commits"
                        current={currentPeriod.commits}
                        previous={previousPeriod.commits}
                        change={calculateChange(currentPeriod.commits, previousPeriod.commits)}
                    />
                    <ComparisonCard
                        label="Time Spent"
                        current={currentPeriod.time}
                        previous={previousPeriod.time}
                        change={calculateChange(currentPeriod.time, previousPeriod.time)}
                        formatter={formatTimeSpent}
                    />
                    <ComparisonCard
                        label="Points Earned"
                        current={currentPeriod.points}
                        previous={previousPeriod.points}
                        change={calculateChange(currentPeriod.points, previousPeriod.points)}
                    />
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">
                        <strong className="text-gray-900">{currentPeriod.period}:</strong> {currentPeriod.entries} entries
                        {' • '}
                        <strong className="text-gray-900">{previousPeriod.period}:</strong> {previousPeriod.entries} entries
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ComparisonCardProps {
    label: string;
    current: number;
    previous: number;
    change: number;
    formatter?: (value: number) => string;
}

function ComparisonCard({ label, current, previous, change, formatter }: ComparisonCardProps) {
    const format = formatter || ((v: number) => String(v));
    const isPositive = change > 0;
    const isNegative = change < 0;

    return (
        <div className="p-4 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-500 mb-2">{label}</div>
            <div className="flex items-end justify-between mb-2">
                <div className="text-2xl font-bold text-gray-900">{format(current)}</div>
                <div
                    className={`text-sm font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
                        }`}
                >
                    {isPositive && '+'}
                    {change}%
                </div>
            </div>
            <div className="text-xs text-gray-500">
                Previous: {format(previous)}
            </div>
        </div>
    );
}

function getPeriods(type: string): { current: ComparisonPeriod; previous: ComparisonPeriod } {
    const now = new Date();

    if (type === 'week') {
        // Current week
        const currentStart = new Date(now);
        currentStart.setDate(now.getDate() - now.getDay());
        currentStart.setHours(0, 0, 0, 0);
        const currentEnd = new Date(currentStart);
        currentEnd.setDate(currentStart.getDate() + 6);
        currentEnd.setHours(23, 59, 59, 999);

        // Previous week
        const previousStart = new Date(currentStart);
        previousStart.setDate(currentStart.getDate() - 7);
        const previousEnd = new Date(previousStart);
        previousEnd.setDate(previousStart.getDate() + 6);
        previousEnd.setHours(23, 59, 59, 999);

        return {
            current: { label: 'This Week', start: currentStart, end: currentEnd },
            previous: { label: 'Last Week', start: previousStart, end: previousEnd },
        };
    }

    // Month comparison
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return {
        current: { label: 'This Month', start: currentStart, end: currentEnd },
        previous: { label: 'Last Month', start: previousStart, end: previousEnd },
    };
}

export default TrackerComparison;
