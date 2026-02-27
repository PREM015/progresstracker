import { useMemo } from 'react';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntry } from '@/types/tracker';
import { formatTimeSpent } from '@/types/tracker';

interface TrackerAggregateViewProps {
    startDate: Date;
    endDate: Date;
    userId?: string;
    groupBy?: 'day' | 'week' | 'month' | 'platform' | 'category';
    className?: string;
}

interface AggregateStats {
    label: string;
    totalProblems: number;
    totalCommits: number;
    totalPRs: number;
    totalTime: number;
    totalPoints: number;
    totalEntries: number;
    avgProblems: number;
    avgCommits: number;
    avgTime: number;
}

export function TrackerAggregateView({
    startDate,
    endDate,
    userId,
    groupBy = 'platform',
    className = ''
}: TrackerAggregateViewProps) {
    const filters = useMemo(() => ({
        startDate,
        endDate,
        limit: 1000
    }), [startDate, endDate]);

    const { entries, isLoading, error } = useTracker(filters);

    const stats = useMemo(() => {
        if (!entries) return [];
        return aggregateEntries(entries, groupBy);
    }, [entries, groupBy]);

    const totals = useMemo(() => {
        if (!entries || entries.length === 0) return null;
        return calculateTotals(entries, 'Overall');
    }, [entries]);

    const aggregateEntries = (entries: TrackerEntry[], groupType: string): AggregateStats[] => {
        const groups = new Map<string, TrackerEntry[]>();

        entries.forEach(entry => {
            let key = '';

            switch (groupType) {
                case 'platform':
                    key = entry.platform?.name || 'Manual Entry';
                    break;
                case 'category':
                    key = entry.category || 'Uncategorized';
                    break;
                case 'day':
                    key = new Date(entry.date).toLocaleDateString();
                    break;
                case 'week':
                    const weekNum = getWeekNumber(new Date(entry.date));
                    key = `Week ${weekNum}`;
                    break;
                case 'month':
                    key = new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                    break;
                default:
                    key = 'All';
            }

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(entry);
        });

        return Array.from(groups.entries())
            .map(([label, groupEntries]) => calculateTotals(groupEntries, label))
            .sort((a, b) => b.totalProblems - a.totalProblems);
    };

    const calculateTotals = (entries: TrackerEntry[], label: string): AggregateStats => {
        const total = entries.reduce((acc, entry) => ({
            problems: acc.problems + entry.problemsSolved,
            commits: acc.commits + entry.commits,
            prs: acc.prs + entry.pullRequests,
            time: acc.time + entry.timeSpent,
            points: acc.points + (entry.points || 0),
        }), { problems: 0, commits: 0, prs: 0, time: 0, points: 0 });

        const count = entries.length || 1;

        return {
            label,
            totalProblems: total.problems,
            totalCommits: total.commits,
            totalPRs: total.prs,
            totalTime: total.time,
            totalPoints: total.points,
            totalEntries: entries.length,
            avgProblems: Math.round(total.problems / count),
            avgCommits: Math.round(total.commits / count),
            avgTime: Math.round(total.time / count),
        };
    };

    const getWeekNumber = (date: Date): number => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    if (isLoading) {
        return (
            <div className={`animate-pulse space-y-4 ${className}`}>
                <div className="h-32 bg-gray-100 rounded-xl"></div>
                <div className="h-24 bg-gray-100 rounded-xl"></div>
                <div className="h-24 bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-50 border border-red-200 rounded-xl p-6 ${className}`}>
                <p className="text-red-600">Failed to load statistics</p>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Overall Totals */}
            {totals && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
                    <h2 className="text-xl font-bold mb-4">Overall Statistics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatCard label="Total Problems" value={totals.totalProblems} />
                        <StatCard label="Total Commits" value={totals.totalCommits} />
                        <StatCard label="Total PRs" value={totals.totalPRs} />
                        <StatCard label="Total Time" value={formatTimeSpent(totals.totalTime)} />
                        <StatCard label="Total Points" value={totals.totalPoints} />
                    </div>
                </div>
            )}

            {/* Grouped Stats */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Grouped by {groupBy}</h3>
                </div>

                {stats.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No data for this period
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {stats.map((stat, idx) => (
                            <AggregateRow key={idx} stat={stat} rank={idx + 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <div className="text-sm opacity-90">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
    );
}

function AggregateRow({ stat, rank }: { stat: AggregateStats; rank: number }) {
    return (
        <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-300">#{rank}</span>
                    <h4 className="font-semibold text-gray-900">{stat.label}</h4>
                </div>
                <span className="text-sm text-gray-500">{stat.totalEntries} entries</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                    <div className="text-gray-500">Problems</div>
                    <div className="font-semibold text-gray-900">{stat.totalProblems}</div>
                </div>
                <div>
                    <div className="text-gray-500">Commits</div>
                    <div className="font-semibold text-gray-900">{stat.totalCommits}</div>
                </div>
                <div>
                    <div className="text-gray-500">Pull Requests</div>
                    <div className="font-semibold text-gray-900">{stat.totalPRs}</div>
                </div>
                <div>
                    <div className="text-gray-500">Time</div>
                    <div className="font-semibold text-gray-900">{formatTimeSpent(stat.totalTime)}</div>
                </div>
                <div>
                    <div className="text-gray-500">Points</div>
                    <div className="font-semibold text-gray-900">{stat.totalPoints}</div>
                </div>
            </div>
        </div>
    );
}

export default TrackerAggregateView;
