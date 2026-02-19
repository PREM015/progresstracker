'use client';

import { useState } from 'react';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntry } from '@/types/tracker';

interface TrackerDuplicateDialogProps {
    entry: TrackerEntry;
    isOpen: boolean;
    onClose: () => void;
    onDuplicate: (date: Date) => Promise<void>;
}

export function TrackerDuplicateDialog({
    entry,
    isOpen,
    onClose,
    onDuplicate
}: TrackerDuplicateDialogProps) {
    const { createEntry } = useTracker();
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const date = new Date(selectedDate);
            if (onDuplicate) {
                await onDuplicate(date);
            } else {
                await createEntry({
                    ...entry,
                    id: undefined,
                    date: date,
                    createdAt: undefined,
                    updatedAt: undefined,
                } as any);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to duplicate entry');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Duplicate Entry</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Entry Preview */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        {entry.platform && (
                            <div
                                className="w-10 h-10 flex items-center justify-center rounded-lg text-xl"
                                style={{ backgroundColor: entry.platform.color + '20' }}
                            >
                                {entry.platform.icon}
                            </div>
                        )}
                        <div>
                            <div className="font-medium text-gray-900">
                                {entry.platform?.name || 'Manual Entry'}
                            </div>
                            <div className="text-sm text-gray-500">
                                {new Date(entry.date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {entry.problemsSolved > 0 && (
                            <div>
                                <span className="text-gray-500">Problems:</span>{' '}
                                <span className="font-medium">{entry.problemsSolved}</span>
                            </div>
                        )}
                        {entry.commits > 0 && (
                            <div>
                                <span className="text-gray-500">Commits:</span>{' '}
                                <span className="font-medium">{entry.commits}</span>
                            </div>
                        )}
                        {entry.timeSpent > 0 && (
                            <div>
                                <span className="text-gray-500">Time:</span>{' '}
                                <span className="font-medium">{entry.timeSpent}m</span>
                            </div>
                        )}
                        {entry.points && entry.points > 0 && (
                            <div>
                                <span className="text-gray-500">Points:</span>{' '}
                                <span className="font-medium">{entry.points}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duplicate to date:
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            This will create a copy of this entry with all metrics on the selected date.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Duplicating...' : 'Duplicate Entry'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

export default TrackerDuplicateDialog;
