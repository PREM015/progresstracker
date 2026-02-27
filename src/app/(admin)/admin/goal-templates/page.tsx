import { GoalTemplatesList, GoalTemplateStats } from '@/components/admin';
import Link from 'next/link';

export default function GoalTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Goal Templates</h1>
          <p className="text-zinc-400">Predefined goal templates for users</p>
        </div>
        <Link
          href="/admin/goal-templates/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          New Template
        </Link>
      </div>

      <GoalTemplateStats />
      <GoalTemplatesList />
    </div>
  );
}
