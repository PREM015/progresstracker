import { EmailTemplatesList } from '@/components/admin';
import Link from 'next/link';

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/email" className="text-zinc-400 hover:text-white">
          ← Back to Email
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Email Templates</h1>
          <p className="text-zinc-400">Create and manage email templates</p>
        </div>
        <Link
          href="/admin/email/templates/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          New Template
        </Link>
      </div>

      <EmailTemplatesList />
    </div>
  );
}
