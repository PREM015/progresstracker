import { EmailDashboard, EmailTemplatesList } from '@/components/admin';
import Link from 'next/link';

export default function EmailPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Email</h1>
          <p className="text-zinc-400">Email templates and campaigns</p>
        </div>
        <Link
          href="/admin/email/templates"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          Manage Templates
        </Link>
      </div>

      <EmailDashboard />
      <EmailTemplatesList />
    </div>
  );
}
