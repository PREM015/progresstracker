'use client';

import { useState } from 'react';
import type { PlatformCategory } from '@prisma/client';
import { TrackerFilter, EntrySource } from '@/types/tracker';

interface TrackerSearchAdvancedProps {
    onSearch: (filters: SearchFilters) => void;
    onReset: () => void;
    className?: string;
}

export interface SearchFilters extends TrackerFilter {
    minCommits?: number;
    minTime?: number;
}

export function TrackerSearchAdvanced({ onSearch, onReset, className = '' }: TrackerSearchAdvancedProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(filters);
    };

    const handleReset = () => {
        setFilters({});
        onReset();
    };

    const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const activeFilterCount = Object.values(filters).filter(v =>
        v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
    ).length;

    return (
        <div className={`bg-white border border-gray-200 rounded-xl ${className}`}>
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <SearchIcon className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-gray-900">Advanced Search</span>
                    {activeFilterCount > 0 && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                <ChevronIcon className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Filters Form */}
            {isExpanded && (
                <form onSubmit={handleSubmit} className="px-6 pb-6 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Text Search */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search in notes
                            </label>
                            <input
                                type="text"
                                value={filters.search || ''}
                                onChange={(e) => updateFilter('search', e.target.value)}
                                placeholder="Search for keywords..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={filters.startDate as string || ''}
                                onChange={(e) => updateFilter('startDate', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={filters.endDate as string || ''}
                                onChange={(e) => updateFilter('endDate', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Minimum Values */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Min Problems
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={filters.minProblems || ''}
                                onChange={(e) => updateFilter('minProblems', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Min Commits
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={filters.minCommits || ''}
                                onChange={(e) => updateFilter('minCommits', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Min Time (minutes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={filters.minTime || ''}
                                onChange={(e) => updateFilter('minTime', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Source */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Entry Source
                            </label>
                            <select
                                value={filters.source || ''}
                                onChange={(e) => updateFilter('source', (e.target.value || undefined) as EntrySource)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">All sources</option>
                                <option value="manual">Manual</option>
                                <option value="sync">Synced</option>
                                <option value="import">Imported</option>
                                <option value="api">API</option>
                            </select>
                        </div>

                        {/* Has Notes */}
                        <div className="flex items-center pt-7">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.hasNotes || false}
                                    onChange={(e) => updateFilter('hasNotes', e.target.checked || undefined)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">Has notes only</span>
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                        >
                            Apply Filters
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

function ChevronIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}

export default TrackerSearchAdvanced;
