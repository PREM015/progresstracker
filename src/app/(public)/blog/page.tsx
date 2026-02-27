"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetch(`/api/blog${category !== 'all' ? `?category=${category}` : ''}`)
      .then(r => r.json())
      .then(data => setPosts(data.posts || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold mb-4">Blog</h1>
        <p className="text-xl text-gray-600 mb-8">Updates, tutorials, and insights from the ProgressTracker team</p>

        <div className="flex gap-2 mb-8">
          {['all', 'updates', 'tutorials', 'features'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg capitalize ${category === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">📝</span>
            <p className="mt-4 text-gray-500">No blog posts yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition"
              >
                {post.coverImage && (
                  <img src={post.coverImage} alt={post.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-2 text-gray-900">{post.title}</h2>
                  <p className="text-gray-600 text-sm line-clamp-3">{post.excerpt}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <span>By {post.author?.name}</span>
                    <span>•</span>
                    <span>{post.readTime} min read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
