'use client';

import { useState } from 'react';

export function PermissionForm({ permission, onSave }: any) {
    const [formData, setFormData] = useState({
        key: permission?.key || '',
        name: permission?.name || '',
        description: permission?.description || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = permission ? `/api/admin/permissions/${permission.id}` : '/api/admin/permissions';
            const res = await fetch(url, {
                method: permission ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('Permission saved!');
            onSave?.();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="text"
                placeholder="Key (e.g., users.create)"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                required
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
            />
            <input
                type="text"
                placeholder="Name (e.g., Create Users)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
            />
            <textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
            />
            <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
                {saving ? 'Saving...' : 'Save Permission'}
            </button>
        </form>
    );
}

export default PermissionForm;
