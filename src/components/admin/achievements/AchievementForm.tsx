'use client';

import { useState, useEffect } from 'react';
import { Achievement, AchievementInput } from '@/hooks/useAdminGamification';

interface AchievementFormProps {
    achievement?: Achievement | null;
    onSubmit: (data: AchievementInput) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function AchievementForm({ achievement, onSubmit, onCancel, isSubmitting = false }: AchievementFormProps) {
    const [formData, setFormData] = useState<AchievementInput>({
        title: '',
        description: '',
        icon: '🏆',
        points: 100,
        rarity: 'COMMON',
        category: 'GENERAL',
        requirementType: 'COUNT',
        requirementValue: 1,
    });

    useEffect(() => {
        if (achievement) {
            setFormData({
                title: achievement.title,
                description: achievement.description,
                icon: achievement.icon,
                points: achievement.points,
                rarity: achievement.rarity,
                category: achievement.category,
                requirementType: achievement.requirementType,
                requirementValue: achievement.requirementValue,
            });
        }
    }, [achievement]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit(formData);
        } catch (err: any) {
            // Error handling should be done by parent or hook
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
                <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Icon</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                        />
                        <div className="flex items-center justify-center w-10 h-10 bg-zinc-800 rounded-lg text-2xl">
                            {formData.icon}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Points</label>
                    <input
                        type="number"
                        required
                        value={formData.points}
                        onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Rarity</label>
                    <select
                        value={formData.rarity}
                        onChange={(e) => setFormData({ ...formData, rarity: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="COMMON">Common</option>
                        <option value="RARE">Rare</option>
                        <option value="EPIC">Epic</option>
                        <option value="LEGENDARY">Legendary</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="GENERAL">General</option>
                        <option value="STREAK">Streak</option>
                        <option value="GOALS">Goals</option>
                        <option value="SOCIAL">Social</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Requirement Type</label>
                    <select
                        value={formData.requirementType}
                        onChange={(e) => setFormData({ ...formData, requirementType: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="COUNT">Count</option>
                        <option value="TIME">Time</option>
                        <option value="CUSTOM">Custom</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Requirement Value</label>
                    <input
                        type="number"
                        required
                        value={formData.requirementValue}
                        onChange={(e) => setFormData({ ...formData, requirementValue: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Saving...' : achievement ? 'Update Achievement' : 'Create Achievement'}
                </button>
            </div>
        </form>
    );
}

export default AchievementForm;
