'use client';

import { GoalTemplateForm } from '@/components/admin';
import Link from 'next/link';
import { useAdminGoalTemplates } from '@/hooks/useAdminTemplates';
import { useRouter } from 'next/navigation';

export default function NewGoalTemplatePage() {
  const { createTemplate, isCreating } = useAdminGoalTemplates();
  const router = useRouter();

  const handleCreate = async (data: any) => {
    try {
      await createTemplate(data);
      router.push('/admin/goal-templates');
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to create template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/goal-templates" className="text-zinc-400 hover:text-white">
          ← Back to Templates
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Create Goal Template</h1>
        <p className="text-zinc-400">Define a new goal template for users</p>
      </div>

      <div className="max-w-2xl">
        <GoalTemplateForm onSubmit={handleCreate} isSubmitting={isCreating} />
      </div>
    </div>
  );
}
