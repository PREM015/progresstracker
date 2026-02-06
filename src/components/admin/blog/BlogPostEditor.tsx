'use client';

import { useState, useEffect } from 'react';

export function BlogPostEditor({ postId }: any) {
    const [post, setPost] = useState<any>(null);
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (postId) {
            fetch(`/api/admin/blog/posts/${postId}`)
                .then(res => res.json())
                .then(data => {
                    setPost(data);
                    setContent(data.content || '');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [postId]);

    const savePost = async () => {
        setSaving(true);
        try {
            await fetch(`/api/admin/blog/posts/${postId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            alert('Post saved!');
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading editor...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Blog Post Editor</h3>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-indigo-500 mb-4"
            />
            <button
                onClick={savePost}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
                {saving ? 'Saving...' : 'Save Post'}
            </button>
        </div>
    );
}

export default BlogPostEditor;
