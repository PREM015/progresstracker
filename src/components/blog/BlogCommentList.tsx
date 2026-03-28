// src/components/blog/BlogCommentList.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BlogCommentItem } from './BlogCommentItem';
import { BlogCommentForm } from './BlogCommentForm';
import { MessageSquare } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  createdAt: string | Date;
  author?: { id: string; name?: string | null; image?: string | null } | null;
  replies?: Comment[];
}

interface Props {
  postId: string;
}

export function BlogCommentList({ postId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/blog/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mt-10">
      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-6">
        <MessageSquare className="h-5 w-5" />
        Comments {!loading && `(${comments.length})`}
      </h3>
      <BlogCommentForm postId={postId} onSuccess={load} placeholder="Join the discussion…" />
      <div className="mt-6 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
              </div>
            </div>
          ))
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => <BlogCommentItem key={c.id} comment={c} postId={postId} onReply={load} />)
        )}
      </div>
    </div>
  );
}

export default BlogCommentList;
