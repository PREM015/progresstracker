'use client';

export function NewsletterPreview({ newsletter }: any) {
    if (!newsletter) return null;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-2">{newsletter.subject}</h3>
            <div className="text-zinc-400 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: newsletter.content }} />
        </div>
    );
}

export default NewsletterPreview;
