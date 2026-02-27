'use client';

import { useState } from 'react';

interface UserFiltersProps {
    onFilterChange: (filters: UserFilterState) => void;
    onReset: () => void;
}

export interface UserFilterState {
    search?: string;
    status?: string;
    role?: string;
    subscription?: string;
    verified?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    dateFrom?: string;
    dateTo?: string;
}

export function UserFilters({ onFilterChange, onReset }: UserFiltersProps) {
    const [filters, setFilters] = useState<UserFilterState>({});
    const [isExpanded, setIsExpanded] = useState(false);

    const updateFilter = <K extends keyof UserFilterState>(key: K, value: UserFilterState[K]) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleReset = () => {
        setFilters({});
        onReset();
    };

    const activeFilterCount = Object.values(filters).filter(v =>
        v !== undefined && v !== '' && v !== null
    ).length;

    return (
        <div className="bg-white border border-gray-200 rounded-xl">
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                <ChevronIcon className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Filters */}
            {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search */}
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search
                            </label>
                            <input
                                type="text"
                                value={filters.search || ''}
                                onChange={(e) => updateFilter('search', e.target.value)}
                                placeholder="Search by name, email, or ID..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={filters.status || ''}
                                onChange={(e) => updateFilter('status', e.target.value || undefined)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">All statuses</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="banned">Banned</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role
                            </label>
                            <select
                                value={filters.role || ''}
                                onChange={(e) => updateFilter('role', e.target.value || undefined)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">All roles</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="moderator">Moderator</option>
                            </select>
                        </div>

                        {/* Subscription */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subscription
                            </label>
                            <select
                                value={filters.subscription || ''}
                                onChange={(e) => updateFilter('subscription', e.target.value || undefined)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">All subscriptions</option>
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Joined From
                            </label>
                            <input
                                type="date"
                                value={filters.dateFrom || ''}
                                onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Joined To
                            </label>
                            <input
                                type="date"
                                value={filters.dateTo || ''}
                                onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Sort */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sort By
                            </label>
                            <select
                                value={filters.sortBy || 'createdAt'}
                                onChange={(e) => updateFilter('sortBy', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="createdAt">Join Date</option>
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                                <option value="lastActive">Last Active</option>
                            </select>
                        </div>

                        {/* Verified */}
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.verified || false}
                                    onChange={(e) => updateFilter('verified', e.target.checked || undefined)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">Verified only</span>
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleReset}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ChevronIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}

export default UserFilters;
