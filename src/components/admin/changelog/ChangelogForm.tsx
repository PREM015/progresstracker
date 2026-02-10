'use client';

import { useState } from 'react';
import { useAdminChangelog, ChangelogEntry, ChangelogInput } from '@/hooks/useAdminChangelog';

export function ChangelogForm({ entry, onSave, onCancel }: { entry?: ChangelogEntry; onSave?: () => void; onCancel?: () => void }) {
    const { createEntry, updateEntry, isCreating, isUpdating } = useAdminChangelog();
    const [data, setData] = useState<ChangelogInput>({
        version: entry?.version || '',
        changes: entry?.changes || '',
        type: entry?.type || 'FEATURE'
    });

    const isSubmitting = isCreating || isUpdating;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (entry) {
                await updateEntry({ id: entry.id, data });
            } else {
                await createEntry(data);
            }
            onSave?.();
        } catch (err: any) {
            alert('Error saving changelog: ' + err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{entry ? 'Edit Entry' : 'New Entry'}</h3>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Version</label>
                <input
                    type="text"
                    placeholder="e.g. 1.0.0"
                    required
                    value={data.version}
                    onChange={e => setData({ ...data, version: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
                <select
                    value={data.type}
                    onChange={e => setData({ ...data, type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                    <option value="FEATURE">Feature</option>
                    <option value="BUGFIX">Bug Fix</option>
                    <option value="IMPROVEMENT">Improvement</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Changes</label>
                <textarea
                    placeholder="Describe the changes..."
                    required
                    value={data.changes}
                    onChange={e => setData({ ...data, changes: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div className="flex gap-4">
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
export default ChangelogForm;
