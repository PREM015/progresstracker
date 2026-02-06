import { GoalTemplateForm } from '@/components/admin';
import Link from 'next/link';

export default function NewGoalTemplatePage() {
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

      <GoalTemplateForm />
    </div>
  );
}
