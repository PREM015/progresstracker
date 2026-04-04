'use client';
import { sanitizeHtml } from '@/lib/sanitize';

export function BlogPostPreview({ post }: any) {
    if (!post) return null;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-2">{post.title}</h2>

            <div className="flex gap-3 mb-4 text-sm">
                <span className="text-zinc-500">By {post.author?.name || 'Unknown'}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                {post.category && (
                    <>
                        <span className="text-zinc-600">•</span>
                        <span className="text-indigo-400">{post.category.name}</span>
                    </>
                )}
            </div>

            <div
                className="text-zinc-400 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
            />
        </div>
    );
}

export default BlogPostPreview;
