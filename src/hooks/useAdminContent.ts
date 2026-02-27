/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminContent.ts
// PURPOSE: Admin hooks - content/blog management
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { AdminContentService } from '@/services/api/admin/content.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
    category: string | null;
    tags: string[];
    viewCount: number;
    publishedAt: string | null;
    author: {
        name: string | null;
        email: string | null;
    };
    createdAt: string;
    updatedAt: string;
}



// =============================================================================
// ADMIN BLOG HOOKS
// =============================================================================

export function useAdminContent(statusFilter: 'all' | 'published' | 'draft' = 'all') {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH POSTS
    // ==========================================================================
    const postsQuery = useQuery({
        queryKey: queryKeys.admin.blog(statusFilter),
        queryFn: async (): Promise<BlogPost[]> => {
            const params: Record<string, string> = {};
            if (statusFilter !== 'all') {
                params.status = statusFilter.toUpperCase();
            }

            return AdminContentService.getPosts(params);
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    // ==========================================================================
    // DELETE POST
    // ==========================================================================
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return AdminContentService.deletePost(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.blog() });
        },
    });

    const deletePost = useCallback(
        async (id: string) => {
            return deleteMutation.mutateAsync(id);
        },
        [deleteMutation]
    );

    return useMemo(() => ({
        posts: postsQuery.data ?? [],
        isLoading: postsQuery.isLoading,
        error: postsQuery.error,

        // Actions
        deletePost,
        refetch: postsQuery.refetch,

        // Mutation states
        isDeleting: deleteMutation.isPending,
        deleteError: deleteMutation.error,
    }), [
        postsQuery.data,
        postsQuery.isLoading,
        postsQuery.error,
        postsQuery.refetch,
        deletePost,
        deleteMutation.isPending,
        deleteMutation.error
    ]);
}

export default useAdminContent;
