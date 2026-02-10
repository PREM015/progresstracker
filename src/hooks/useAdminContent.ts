/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminContent.ts
// PURPOSE: Admin hooks - content/blog management
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
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

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
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

            const response = await apiClient.get<any>('/admin/blog', params);

            // response is ApiResponse<any>. The actual data might be directly in response.data 
            // or if apiClient logic differs, we handle potential shapes.

            if (response.error) {
                return [];
            }

            const payload = response.data;

            // payload is the parsed JSON body
            if (Array.isArray(payload)) return payload;
            if (payload && payload.posts && Array.isArray(payload.posts)) return payload.posts;
            if (payload && payload.data && Array.isArray(payload.data)) return payload.data;

            return [];
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    // ==========================================================================
    // DELETE POST
    // ==========================================================================
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.delete(`/admin/blog/${id}`);

            if (response.error) {
                throw new Error(response.error);
            }

            return response.data;
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
