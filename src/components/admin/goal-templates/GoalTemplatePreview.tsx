'use client';

import { useAdminGoalTemplate, GoalTemplate } from '@/hooks/useAdminTemplates';

interface GoalTemplatePreviewProps {
    template?: GoalTemplate | null;
    templateId?: string;
}

export function GoalTemplatePreview({ template, templateId }: GoalTemplatePreviewProps) {
    const { template: fetchedTemplate, isLoading } = useAdminGoalTemplate(templateId || '');

    const displayTemplate = template || fetchedTemplate;

    if (templateId && isLoading) return <div className="p-6 text-zinc-500">Loading preview...</div>;

    if (!displayTemplate) return null;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">{displayTemplate.name}</h2>
            <p className="text-zinc-400 mb-4">{displayTemplate.description}</p>
            <div className="flex gap-2">
                <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded">
                    {displayTemplate.category}
                </span>
                {displayTemplate.difficulty && (
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded">
                        {displayTemplate.difficulty}
                    </span>
                )}
                {displayTemplate.durationDays && (
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded">
                        {displayTemplate.durationDays} days
                    </span>
                )}
            </div>
        </div>
    );
}

export default GoalTemplatePreview;
