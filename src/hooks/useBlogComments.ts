'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { ContentService } from '@/services/api/content.service';

export function useBlogComments(postId: string) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  const commentsQuery = useQuery({
    queryKey: ['blog-comments', postId],
    queryFn: () => ContentService.getComments(postId),
    enabled: !!postId,
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => ContentService.addComment(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments', postId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => ContentService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments', postId] });
    },
  });

  return useMemo(() => ({
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    addComment: (content: string) => addCommentMutation.mutateAsync(content),
    deleteComment: (commentId: string) => deleteCommentMutation.mutateAsync(commentId),
    isAdding: addCommentMutation.isPending,
    isDeleting: deleteCommentMutation.isPending
  }), [commentsQuery, addCommentMutation, deleteCommentMutation]);
}

export default useBlogComments;
