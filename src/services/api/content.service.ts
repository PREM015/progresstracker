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
    }
};
