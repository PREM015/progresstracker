'use client';

import { useState, useEffect } from 'react';

interface UserFormProps {
    userId?: string;
    onSuccess: () => void;
    onCancel: () => void;
}

interface UserFormData {
    name: string;
    email: string;
    role: string;
    status: string;
    subscription: string;
    emailVerified: boolean;
}

export function UserForm({ userId, onSuccess, onCancel }: UserFormProps) {
    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        role: 'user',
        status: 'active',
        subscription: 'free',
        emailVerified: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            fetchUserData();
        }
    }, [userId]);

    const fetchUserData = async () => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`);
            if (!res.ok) throw new Error('Failed to fetch user');

            const data = await res.json();
            setFormData({
                name: data.name || '',
                email: data.email || '',
                role: data.role || 'user',
                status: data.status || 'active',
                subscription: data.subscriptionTier || 'free',
                emailVerified: data.emailVerified || false,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load user');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
            const method = userId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to save user');
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {userId ? 'Edit User' : 'Create User'}
                </h3>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="John Doe"
                />
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                </label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="john@example.com"
                />
            </div>

            {/* Role */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                </label>
                <select
                    value={formData.role}
                    onChange={(e) => updateField('role', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                </select>
            </div>

            {/* Status */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                </label>
                <select
                    value={formData.status}
                    onChange={(e) => updateField('status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                    <option value="pending">Pending</option>
                </select>
            </div>

            {/* Subscription */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription
                </label>
                <select
                    value={formData.subscription}
                    onChange={(e) => updateField('subscription', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                </select>
            </div>

            {/* Email Verified */}
            <div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.emailVerified}
                        onChange={(e) => updateField('emailVerified', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Email verified</span>
                </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Saving...' : userId ? 'Update User' : 'Create User'}
                </button>
            </div>
        </form>
    );
}

export default UserForm;
