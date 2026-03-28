// src/components/blog/BlogCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, Eye } from 'lucide-react';

interface Props {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    coverImage?: string | null;
    readTimeMinutes?: number | null;
    viewCount?: number;
    publishedAt?: string | Date | null;
    author?: { name?: string | null; image?: string | null } | null;
    tags?: string[];
  };
}

export function BlogCard({ post }: Props) {
  return (
    <article className="group flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {post.coverImage && (
        <Link href={`/blog/${post.slug}`} className="block aspect-[16/9] overflow-hidden">
          <Image
            src={post.coverImage}
            alt={post.title}
            width={800}
            height={450}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
      )}
      <div className="flex flex-col flex-1 p-5">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
        <Link href={`/blog/${post.slug}`}>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-3 flex-1">{post.excerpt}</p>
        )}
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(post.publishedAt).toLocaleDateString()}
            </span>
          )}
          {post.readTimeMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {post.readTimeMinutes} min
            </span>
          )}
          {post.viewCount !== undefined && (
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.viewCount}</span>
          )}
        </div>
        {post.author && (
          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            {post.author.image && (
              <Image src={post.author.image} alt={post.author.name || ''} width={24} height={24} className="rounded-full" />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">{post.author.name}</span>
          </div>
        )}
      </div>
    </article>
  );
}

export default BlogCard;
