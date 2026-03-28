// src/components/blog/BlogLikeButton.tsx
'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  postId: string;
  initialCount?: number;
  initialLiked?: boolean;
}

export function BlogLikeButton({ postId, initialCount = 0, initialLiked = false }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/blog/posts/${postId}/like`, {
        method: liked ? 'DELETE' : 'POST',
      });
      if (res.ok) {
        setLiked(!liked);
        setCount((v) => v + (liked ? -1 : 1));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={liked ? 'Unlike post' : 'Like post'}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
        liked
          ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-800'
          : 'border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-300 hover:text-red-400'
      )}
    >
      <Heart className={cn('h-4 w-4 transition-transform', liked && 'fill-current scale-110')} />
      <span>{count}</span>
    </button>
  );
}

export default BlogLikeButton;
