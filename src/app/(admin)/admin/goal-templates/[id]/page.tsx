'use client';

import { GoalTemplateForm, GoalTemplatePreview } from '@/components/admin';
import Link from 'next/link';
import { useAdminGoalTemplate, useAdminGoalTemplates } from '@/hooks/useAdminTemplates'; // Import updateTemplate from main hook
import { useRouter } from 'next/navigation';

export default function GoalTemplateDetailPage({ params }: { params: { id: string } }) {
  const { template, isLoading } = useAdminGoalTemplate(params.id);
  const { updateTemplate, isUpdating } = useAdminGoalTemplates();
  const router = useRouter();

  const handleSave = async (data: any) => {
    try {
      await updateTemplate({ id: params.id, data });
      router.push('/admin/goal-templates');
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('Failed to update template');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/goal-templates" className="text-zinc-400 hover:text-white">
          ← Back to Templates
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Edit Goal Template</h1>
        <p className="text-zinc-400">Update template details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalTemplateForm
          template={template}
          onSubmit={handleSave}
          isSubmitting={isUpdating}
        />
        <GoalTemplatePreview template={template} />
      </div>
    </div>
  );
}
