'use client';
import { useState, useEffect } from 'react';
import { GoalTemplate, GoalTemplateInput } from '@/hooks/useAdminTemplates';

interface GoalTemplateFormProps {
    template?: GoalTemplate | null;
    onSubmit: (data: GoalTemplateInput) => Promise<void>;
    isSubmitting?: boolean;
}

export function GoalTemplateForm({ template, onSubmit, isSubmitting = false }: GoalTemplateFormProps) {
    const [data, setData] = useState<GoalTemplateInput>({
        name: '',
        description: '',
        category: 'PERSONAL',
        difficulty: 'MEDIUM',
        durationDays: 30
    });

    useEffect(() => {
        if (template) {
            setData({
                name: template.name,
                description: template.description,
                category: template.category,
                difficulty: template.difficulty,
                durationDays: template.durationDays
            });
        }
    }, [template]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit(data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
                <input
                    type="text"
                    required
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                <textarea
                    required
                    value={data.description}
                    onChange={(e) => setData({ ...data, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
                    <select
                        value={data.category}
                        onChange={(e) => setData({ ...data, category: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="PERSONAL">Personal</option>
                        <option value="PROFESSIONAL">Professional</option>
                        <option value="HEALTH">Health</option>
                        <option value="FINANCIAL">Financial</option>
                        <option value="EDUCATION">Education</option>
                        <option value="SOCIAL">Social</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Difficulty</label>
                    <select
                        value={data.difficulty}
                        onChange={(e) => setData({ ...data, difficulty: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                    </select>
                </div>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
                {isSubmitting ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </button>
        </form>
    );
}

export default GoalTemplateForm;
