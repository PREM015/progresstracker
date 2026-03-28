// src/components/blog/BlogCommentItem.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MessageSquare, CornerDownRight } from 'lucide-react';
import { BlogCommentForm } from './BlogCommentForm';

interface Comment {
  id: string;
  content: string;
  createdAt: string | Date;
  author?: { id: string; name?: string | null; image?: string | null } | null;
  replies?: Comment[];
}

interface Props {
  comment: Comment;
  postId: string;
  depth?: number;
  onReply?: () => void;
}

export function BlogCommentItem({ comment, postId, depth = 0, onReply }: Props) {
  const [replying, setReplying] = useState(false);

  return (
    <div className={`flex gap-3 ${depth > 0 ? 'ml-8' : ''}`}>
      <div className="flex-shrink-0">
        {comment.author?.image ? (
          <Image src={comment.author.image} alt={comment.author.name || ''} width={32} height={32} className="rounded-full" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-500">
            {comment.author?.name?.[0] || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.author?.name || 'Anonymous'}</span>
            <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
        </div>
        {depth < 2 && (
          <button
            onClick={() => setReplying((r) => !r)}
            className="mt-1 ml-2 flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
          >
            <MessageSquare className="h-3 w-3" /> Reply
          </button>
        )}
        {replying && (
          <div className="mt-2 ml-2">
            <BlogCommentForm postId={postId} parentId={comment.id} onSuccess={() => { setReplying(false); onReply?.(); }} placeholder="Write a reply…" />
          </div>
        )}
        {comment.replies?.map((reply) => (
          <div key={reply.id} className="mt-3">
            <CornerDownRight className="h-4 w-4 text-gray-300 dark:text-gray-600 inline mr-1" />
            <BlogCommentItem comment={reply} postId={postId} depth={depth + 1} onReply={onReply} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default BlogCommentItem;
