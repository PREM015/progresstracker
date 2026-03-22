import { httpClient } from '@/lib/http-client';
import { BlogPost, ChangelogEntry } from '@/types/content';

export const ContentService = {
    /**
     * Get changelog entries
     */
    getChangelog: async (limit: number = 20): Promise<ChangelogEntry[]> => {
        const response = await httpClient.get<ChangelogEntry[]>('/api/public/changelog', {
            params: { limit: limit.toString() }
        });
        return response || [];
    },

    /**
     * Get blog posts
     */
    getBlogPosts: async (): Promise<BlogPost[]> => {
        const response = await httpClient.get<BlogPost[]>('/api/blog');
        return response || [];
    },

    /**
     * Get single blog post
     */
    getBlogPost: async (slug: string): Promise<BlogPost> => {
        return httpClient.get<BlogPost>(`/api/blog/${slug}`);
    },
    /**
     * Get blog post comments
     */
    getComments: async (postId: string): Promise<any[]> => {
        const response = await httpClient.get<any[]>(`/api/blog/${postId}/comments`);
        return response || [];
    },

    /**
     * Add a comment to a blog post
     */
    addComment: async (postId: string, content: string): Promise<any> => {
        return httpClient.post<any>(`/api/blog/${postId}/comments`, { content });
    },

    /**
     * Delete a comment
     */
    deleteComment: async (commentId: string): Promise<boolean> => {
        const response = await httpClient.delete<{ success: boolean }>(`/api/blog/comments/${commentId}`);
        return response.success;
    }
};

