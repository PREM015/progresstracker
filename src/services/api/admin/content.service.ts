import { httpClient } from '@/lib/http-client';

export const AdminContentService = {
    /**
     * Get blog posts
     */
    getPosts: async (params?: Record<string, string>): Promise<any[]> => {
        const response = await httpClient.get<{ posts: any[] }>('/api/admin/blog', { params });
        return response.posts || [];
    },

    /**
     * Delete blog post
     */
    deletePost: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/admin/blog/${id}`);
    },

    getContent: async (): Promise<unknown> => {
        const response = await httpClient.get<{ content: unknown }>('/api/admin/content');
        return response.content;
    },
    createContent: async (data: unknown): Promise<unknown> => {
        const response = await httpClient.post<{ content: unknown }>('/api/admin/content', data);
        return response.content;
    },
    updateContent: async (id: string, data: unknown): Promise<unknown> => {
        const response = await httpClient.put<{ content: unknown }>(`/api/admin/content/${id}`, data);
        return response.content;
    },
    deleteContent: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/admin/content/${id}`);
    },
};
