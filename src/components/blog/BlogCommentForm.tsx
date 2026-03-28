// src/components/blog/BlogCommentForm.tsx
'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface Props {
  postId: string;
  parentId?: string;
  onSuccess?: () => void;
  placeholder?: string;
}

export function BlogCommentForm({ postId, parentId, onSuccess, placeholder = 'Write a comment…' }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/blog/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), parentId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to post comment');
      setContent('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-4 w-4" /> {loading ? 'Posting…' : 'Post Comment'}
        </button>
      </div>
    </form>
  );
}

export default BlogCommentForm;
