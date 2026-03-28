// src/components/blog/BlogRelatedPosts.tsx
'use client';

import React from 'react';
import { BlogCard } from './BlogCard';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImage?: string | null;
  readTimeMinutes?: number | null;
  publishedAt?: string | Date | null;
  author?: { name?: string | null; image?: string | null } | null;
  tags?: string[];
}

interface Props {
  posts: Post[];
  title?: string;
}

export function BlogRelatedPosts({ posts, title = 'Related Posts' }: Props) {
  if (!posts.length) return null;
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => <BlogCard key={post.id} post={post} />)}
      </div>
    </section>
  );
}

export default BlogRelatedPosts;
