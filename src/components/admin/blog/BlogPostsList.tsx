'use client';

import { useState, useEffect } from 'react';

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    status: string;
    category: string | null;
    tags: string[];
    viewCount: number;
    publishedAt: string | null;
    author: {
        name: string | null;
        email: string | null;
    };
    createdAt: string;
    updatedAt: string;
}

export function BlogPostsList() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

    useEffect(() => {
        fetchPosts();
    }, [filter]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter.toUpperCase());

            const res = await fetch(`/api/admin/blog?${params}`);
            if (!res.ok) throw new Error('Failed to fetch posts');
            const data = await res.json();
            setPosts(data.posts || data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const deletePost = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"?`)) return;

        try {
            const res = await fetch(`/api/admin/blog/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete post');
            fetchPosts();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('published')}
                        className={`px-4 py-2 rounded-lg transition-colors ${filter === 'published'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                    >
                        Published
                    </button>
                    <button
                        onClick={() => setFilter('draft')}
                        className={`px-4 py-2 rounded-lg transition-colors ${filter === 'draft'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                    >
                        Drafts
                    </button>
                </div>

                <a
                    href="/admin/blog/new"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    New Post
                </a>
            </div>

            {loading ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                    Loading posts...
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                    No blog posts found
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {posts.map((post) => (
                        <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-white">{post.title}</h3>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${post.status === 'PUBLISHED'
                                                ? 'bg-green-500/20 text-green-400'
                                                : post.status === 'DRAFT'
                                                    ? 'bg-yellow-500/20 text-yellow-400'
                                                    : 'bg-zinc-700 text-zinc-300'
                                            }`}>
                                            {post.status}
                                        </span>
                                        {post.category && (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                                                {post.category}
                                            </span>
                                        )}
                                    </div>

                                    {post.excerpt && (
                                        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{post.excerpt}</p>
                                    )}

                                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                                        <span>By {post.author.name || post.author.email}</span>
                                        <span>•</span>
                                        <span>{post.viewCount} views</span>
                                        <span>•</span>
                                        <span>
                                            {post.publishedAt
                                                ? `Published ${new Date(post.publishedAt).toLocaleDateString()}`
                                                : `Created ${new Date(post.createdAt).toLocaleDateString()}`}
                                        </span>
                                    </div>

                                    {post.tags.length > 0 && (
                                        <div className="flex gap-2 mt-3">
                                            {post.tags.map((tag) => (
                                                <span key={tag} className="px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <a
                                        href={`/admin/blog/${post.id}/edit`}
                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                    >
                                        Edit
                                    </a>
                                    <button
                                        onClick={() => deletePost(post.id, post.title)}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default BlogPostsList;
