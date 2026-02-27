'use client';

import React, { useState, useEffect } from 'react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  category: string;
  thumbnail?: string;
}

interface BlogListProps {
  className?: string;
}

export const BlogList: React.FC<BlogListProps> = ({
  className = '',
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    fetch('/api/blog')
      .then(r => r.json())
      .then(data => setPosts(data));
  }, []);

  return (
    <div className={`${className}`}>
      <h2 className="text-3xl font-bold mb-8">Latest Articles</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <article key={post.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
            {post.thumbnail && (
              <img src={post.thumbnail} alt={post.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full mb-3">
                {post.category}
              </span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>By {post.author}</span>
                <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <span className="text-5xl mb-4 block">📝</span>
          No blog posts yet
        </div>
      )}
    </div>
  );
};

export default BlogList;
