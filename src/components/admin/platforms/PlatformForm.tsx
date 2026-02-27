'use client';

import { useState } from 'react';

export function PlatformForm({ platform, onSave }: { platform?: any; onSave?: () => void }) {
    const [formData, setFormData] = useState({
        name: platform?.name || '',
        category: platform?.category || 'PRODUCTIVITY',
        description: platform?.description || '',
        isActive: platform?.isActive || true,
        apiEndpoint: platform?.apiEndpoint || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = platform ? `/api/admin/platforms/${platform.id}` : '/api/admin/platforms';
            const res = await fetch(url, {
                method: platform ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to save');
            alert(`Platform ${platform ? 'updated' : 'created'} successfully!`);
            onSave?.();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">
                {platform ? 'Edit Platform' : 'Create New Platform'}
            </h3>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Platform Name</label>
                <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
                <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                    <option value="PRODUCTIVITY">Productivity</option>
                    <option value="FITNESS">Fitness</option>
                    <option value="FINANCE">Finance</option>
                    <option value="SOCIAL">Social</option>
                    <option value="OTHER">Other</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">API Endpoint</label>
                <input
                    type="url"
                    value={formData.apiEndpoint}
                    onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-white">Active</label>
            </div>

            <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
                {saving ? 'Saving...' : (platform ? 'Update Platform' : 'Create Platform')}
            </button>
        </form>
    );
}

export default PlatformForm;
