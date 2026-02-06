import { EmailTemplateForm, EmailTemplatePreview } from '@/components/admin';
import Link from 'next/link';

export default function EmailTemplateDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/email/templates" className="text-zinc-400 hover:text-white">
          ← Back to Templates
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Edit Email Template</h1>
        <p className="text-zinc-400">Update template content and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmailTemplateForm templateId={params.id} />
        <EmailTemplatePreview templateId={params.id} />
      </div>
    </div>
  );
}
