import { useMemo } from 'react';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntry } from '@/types/tracker';
import { formatTimeSpent, getActivitySummary, MOOD_CONFIG } from '@/types/tracker';

interface TrackerDailyViewProps {
    date: Date;
    userId?: string;
    onEdit?: (entry: TrackerEntry) => void;
    onDelete?: (id: string) => void;
    className?: string;
}

export function TrackerDailyView({ date, userId, onEdit, onDelete, className = '' }: TrackerDailyViewProps) {
    const filters = useMemo(() => {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate, limit: 100 };
    }, [date]);

    const { entries, isLoading, error } = useTracker(filters);

    const formattedDate = useMemo(() => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, [date]);

    const dailyTotals = useMemo(() => {
        return entries.reduce((acc, entry) => ({
            problems: acc.problems + entry.problemsSolved,
            commits: acc.commits + entry.commits,
            time: acc.time + entry.timeSpent,
            points: acc.points + (entry.points || 0),
        }), { problems: 0, commits: 0, time: 0, points: 0 });
    }, [entries]);

    if (isLoading) {
        return (
            <div className={`animate-pulse space-y-4 ${className}`}>
                <div className="h-24 bg-gray-100 rounded-xl"></div>
                <div className="h-32 bg-gray-100 rounded-xl"></div>
                <div className="h-32 bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-50 border border-red-200 rounded-xl p-6 ${className}`}>
                <p className="text-red-600">Failed to load entries</p>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
                <h2 className="text-2xl font-bold mb-4">{formattedDate}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-sm opacity-90">Problems Solved</div>
                        <div className="text-3xl font-bold">{dailyTotals.problems}</div>
                    </div>
                    <div>
                        <div className="text-sm opacity-90">Commits</div>
                        <div className="text-3xl font-bold">{dailyTotals.commits}</div>
                    </div>
                    <div>
                        <div className="text-sm opacity-90">Time Spent</div>
                        <div className="text-3xl font-bold">{formatTimeSpent(dailyTotals.time)}</div>
                    </div>
                    <div>
                        <div className="text-sm opacity-90">Points</div>
                        <div className="text-3xl font-bold">{dailyTotals.points}</div>
                    </div>
                </div>
            </div>

            {/* Entries */}
            {entries.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <span className="text-6xl mb-4 block">📝</span>
                    <p className="text-gray-500 text-lg">No entries for this day</p>
                    <p className="text-gray-400 text-sm mt-2">Add your first entry to get started</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {entries.map((entry) => (
                        <DailyEntryCard
                            key={entry.id}
                            entry={entry}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface DailyEntryCardProps {
    entry: TrackerEntry;
    onEdit?: (entry: TrackerEntry) => void;
    onDelete?: (id: string) => void;
}

function DailyEntryCard({ entry, onEdit, onDelete }: DailyEntryCardProps) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {entry.platform && (
                        <div
                            className="w-12 h-12 flex items-center justify-center rounded-xl text-2xl"
                            style={{ backgroundColor: entry.platform.color + '20' }}
                        >
                            {entry.platform.icon}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {entry.platform?.name || 'Manual Entry'}
                        </h3>
                        <p className="text-sm text-gray-500">{getActivitySummary(entry)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(entry)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit entry"
                        >
                            <EditIcon className="w-5 h-5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={() => onDelete(entry.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete entry"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {entry.problemsSolved > 0 && (
                    <MetricBadge label="Problems" value={entry.problemsSolved} color="indigo" />
                )}
                {entry.commits > 0 && (
                    <MetricBadge label="Commits" value={entry.commits} color="green" />
                )}
                {entry.pullRequests > 0 && (
                    <MetricBadge label="PRs" value={entry.pullRequests} color="blue" />
                )}
                {entry.timeSpent > 0 && (
                    <MetricBadge label="Time" value={formatTimeSpent(entry.timeSpent)} color="purple" />
                )}
            </div>

            {/* Mood & Notes */}
            {(entry.mood || entry.notes) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    {entry.mood && (
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{MOOD_CONFIG[entry.mood as keyof typeof MOOD_CONFIG].emoji}</span>
                            <span className="text-sm text-gray-600">{MOOD_CONFIG[entry.mood as keyof typeof MOOD_CONFIG].label}</span>
                        </div>
                    )}
                    {entry.notes && (
                        <p className="text-sm text-gray-600 mt-2">{entry.notes}</p>
                    )}
                </div>
            )}

            {/* Tags */}
            {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {entry.tags.map((tag, idx) => (
                        <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function MetricBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-700',
        green: 'bg-green-50 text-green-700',
        blue: 'bg-blue-50 text-blue-700',
        purple: 'bg-purple-50 text-purple-700',
    };

    return (
        <div className={`px-3 py-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.indigo}`}>
            <div className="text-xs opacity-75">{label}</div>
            <div className="font-bold">{value}</div>
        </div>
    );
}

function EditIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

export default TrackerDailyView;
