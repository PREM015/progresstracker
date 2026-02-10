'use client';

import { useState, useEffect } from 'react';
import { Permission, PermissionInput } from '@/hooks/useAdminAccess';

interface PermissionFormProps {
    permission?: Permission | null;
    onSubmit: (data: PermissionInput) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function PermissionForm({ permission, onSubmit, onCancel, isSubmitting = false }: PermissionFormProps) {
    const [formData, setFormData] = useState<PermissionInput>({
        key: '',
        name: '',
        description: '',
    });

    useEffect(() => {
        if (permission) {
            setFormData({
                key: permission.key,
                name: permission.name,
                description: permission.description || '',
            });
        }
    }, [permission]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit(formData);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Key</label>
                <input
                    type="text"
                    placeholder="Key (e.g., users.create)"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
                <input
                    type="text"
                    placeholder="Name (e.g., Create Users)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                <textarea
                    placeholder="Description (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Saving...' : permission ? 'Update Permission' : 'Create Permission'}
                </button>
            </div>
        </form>
    );
}

export default PermissionForm;
