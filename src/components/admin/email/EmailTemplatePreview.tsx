'use client';
import { sanitizeHtml } from '@/lib/sanitize';
export function EmailTemplatePreview({ template }: any) { return <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><div className="text-white font-semibold mb-2">{template?.subject}</div><div className="text-zinc-400" dangerouslySetInnerHTML={{ __html: sanitizeHtml(template?.body || '') }}></div></div>; }
export default EmailTemplatePreview;
