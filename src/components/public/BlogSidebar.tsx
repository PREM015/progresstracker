'use client';

import React from 'react';

interface BlogSidebarProps {
  categories: string[];
  recentPosts: Array<{ title: string; slug: string }>;
  className?: string;
}

export const BlogSidebar: React.FC<BlogSidebarProps> = ({
  categories,
  recentPosts,
  className = '',
}) => {
  return (
    <aside className={`bg-white border rounded-xl p-6 ${className}`}>
      <div className="mb-8">
        <h3 className="font-bold text-lg mb-4">Categories</h3>
        <div className="space-y-2">
          {categories.map(category => (
            <a
              key={category}
              href={`/blog/category/${category.toLowerCase()}`}
              className="block px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {category}
            </a>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-4">Recent Posts</h3>
        <div className="space-y-3">
          {recentPosts.map(post => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block text-sm text-gray-700 hover:text-indigo-600"
            >
              {post.title}
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default BlogSidebar;
