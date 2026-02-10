'use client';

import { useState } from 'react';
import { useAdminFeatures, FeatureFlag } from '@/hooks/useAdminFeatures';

export function FeatureFlagForm({ flag, onSave, onCancel }: { flag?: FeatureFlag; onSave?: () => void; onCancel?: () => void }) {
    const { createFlag, updateFlag, isCreating, isUpdating } = useAdminFeatures();
    const [data, setData] = useState({
        key: flag?.key || '',
        name: flag?.name || '',
        description: flag?.description || '',
        isEnabled: flag?.isEnabled || false
    });

    const isSubmitting = isCreating || isUpdating;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (flag) {
                await updateFlag({ key: flag.key, data });
            } else {
                await createFlag(data);
            }
            onSave?.();
        } catch (err: any) {
            alert('Error saving feature flag: ' + err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{flag ? 'Edit Feature Flag' : 'New Feature Flag'}</h3>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Key</label>
                <input
                    type="text"
                    placeholder="e.g. new-dashboard"
                    required
                    disabled={!!flag}
                    value={data.key}
                    onChange={e => setData({ ...data, key: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                <input
                    type="text"
                    placeholder="e.g. New Dashboard"
                    required
                    value={data.name}
                    onChange={e => setData({ ...data, name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                <textarea
                    placeholder="Description of the feature..."
                    value={data.description}
                    onChange={e => setData({ ...data, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isEnabled"
                    checked={data.isEnabled}
                    onChange={e => setData({ ...data, isEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isEnabled" className="text-sm font-medium text-white">Enabled</label>
            </div>

            <div className="flex gap-4 pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Saving...' : 'Save'}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
export default FeatureFlagForm;
