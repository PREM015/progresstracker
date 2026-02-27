'use client';

import React from 'react';

interface BlogPostProps {
  post: {
    title: string;
    content: string;
    author: string;
    publishedAt: string;
    category: string;
    readTime?: number;
  };
  className?: string;
}

export const BlogPost: React.FC<BlogPostProps> = ({
  post,
  className = '',
}) => {
  return (
    <article className={`bg-white rounded-xl ${className}`}>
      <div className="max-w-3xl mx-auto p-8">
        <div className="mb-8">
          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full mb-4">
            {post.category}
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-gray-600 text-sm">
            <span>By {post.author}</span>
            <span>•</span>
            <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
            {post.readTime && (
              <>
                <span>•</span>
                <span>{post.readTime} min read</span>
              </>
            )}
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          {post.content}
        </div>
      </div>
    </article>
  );
};

export default BlogPost;
