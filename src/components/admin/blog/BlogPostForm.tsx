'use client';
import { useState } from 'react';

export function BlogPostForm({ post, onSave }: any) {
    const [data, setData] = useState({
        title: post?.title || '',
        content: post?.content || '',
        excerpt: post?.excerpt || '',
        status: post?.status || 'DRAFT',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(post ? `/api/admin/blog/${post.id}` : '/api/admin/blog', {
            method: post ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) onSave?.();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Title" value={data.title} onChange={e => setData({ ...data, title: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" />
            <textarea placeholder="Excerpt" value={data.excerpt} onChange={e => setData({ ...data, excerpt: e.target.value })} rows={3} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" />
            <textarea placeholder="Content" value={data.content} onChange={e => setData({ ...data, content: e.target.value })} rows={10} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white" />
            <select value={data.status} onChange={e => setData({ ...data, status: e.target.value })} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
            </select>
            <button type="submit" className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Save</button>
        </form>
    );
}
export default BlogPostForm;
