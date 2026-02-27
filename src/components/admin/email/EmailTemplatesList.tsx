'use client';

import { useAdminEmailTemplates } from '@/hooks/useAdminCommunication';
import Link from 'next/link';

export function EmailTemplatesList() {
    const { templates, isLoading: loading } = useAdminEmailTemplates();

    if (loading) return <div className="text-zinc-500 text-center p-8">Loading templates...</div>;

    return (
        <div className="space-y-4">
            {templates.map(t => (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-white font-semibold">{t.name}</div>
                            <div className="text-zinc-500 text-sm">{t.subject}</div>
                        </div>
                        <Link href={`/admin/email/templates/${t.id}`} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg">
                            Edit
                        </Link>
                    </div>
                </div>
            ))}
            {templates.length === 0 && <div className="text-zinc-500 text-center">No templates found</div>}
        </div>
    );
}
export default EmailTemplatesList;
