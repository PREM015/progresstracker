'use client';
import { useAdminGoalTemplates } from '@/hooks/useAdminTemplates';
import Link from 'next/link';

export function GoalTemplatesList() {
    const { templates, isLoading: loading, error, deleteTemplate } = useAdminGoalTemplates();

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this template?')) return;
        try {
            await deleteTemplate(id);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error loading templates</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((t) => (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">{t.name}</h3>
                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{t.description}</p>
                    <div className="flex justify-between items-center mt-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-400`}>
                            {t.category}
                        </span>
                        <div className="flex gap-2">
                            <Link
                                href={`/admin/goal-templates/${t.id}`}
                                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm"
                            >
                                Edit
                            </Link>
                            <button
                                onClick={() => handleDelete(t.id)}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            {templates.length === 0 && (
                <div className="col-span-full text-center text-zinc-500 py-12">
                    No templates found.
                </div>
            )}
        </div>
    );
}

export default GoalTemplatesList;
