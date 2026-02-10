'use client';

import { useState } from 'react';
import { useAdminFeatures } from '@/hooks/useAdminFeatures';

export function FeatureFlagsList() {
    const { flags, isLoading: loading, error, toggleFlag, deleteFlag } = useAdminFeatures();
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleToggleFlag = async (key: string, isEnabled: boolean) => {
        try {
            await toggleFlag(key, !isEnabled);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleDeleteFlag = async (key: string) => {
        if (!confirm(`Delete feature flag ${key}?`)) return;

        try {
            await deleteFlag(key);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                <div className="text-center text-zinc-500">Loading feature flags...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Feature Flags</h2>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    Create Flag
                </button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400">
                    Error loading feature flags: {(error as any)?.message || 'Unknown error'}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {flags.map((flag) => (
                    <div key={flag.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-semibold text-white">{flag.name}</h3>
                                    <span className="px-2 py-1 rounded text-xs font-mono bg-zinc-800 text-zinc-400">
                                        {flag.key}
                                    </span>
                                    <button
                                        onClick={() => handleToggleFlag(flag.key, flag.isEnabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flag.isEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${flag.isEnabled ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {flag.description && (
                                    <p className="text-sm text-zinc-400 mb-4">{flag.description}</p>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <span className="text-zinc-500">Strategy</span>
                                        <div className="text-white font-medium mt-1">{flag.rolloutStrategy}</div>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">Rollout</span>
                                        <div className="text-white font-medium mt-1">{flag.rolloutPercentage}%</div>
                                    </div>
                                    {flag.enabledTiers.length > 0 && (
                                        <div>
                                            <span className="text-zinc-500">Tiers</span>
                                            <div className="text-white font-medium mt-1">
                                                {flag.enabledTiers.join(', ')}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-zinc-500">Updated</span>
                                        <div className="text-white font-medium mt-1">
                                            {new Date(flag.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDeleteFlag(flag.key)}
                                className="ml-4 p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}

                {flags.length === 0 && !loading && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                        No feature flags yet
                    </div>
                )}
            </div>
        </div>
    );
}

export default FeatureFlagsList;
