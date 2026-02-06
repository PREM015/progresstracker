import { NextRequest, NextResponse } from 'next/server';
import apiResponse from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
    try {
        // Mock blog data - replace with actual database queries
        const blogs = [
            {
                slug: 'getting-started-with-progress-tracking',
                title: 'Getting Started with Progress Tracking',
                excerpt: 'Learn how to effectively track your coding progress and stay motivated on your learning journey.',
                author: 'Admin',
                publishedAt: new Date('2024-01-15').toISOString(),
                readTime: 5,
                category: 'tutorials',
                tags: ['beginners', 'guides'],
            },
            {
                slug: 'mastering-leetcode-strategies',
                title: 'Mastering LeetCode: Proven Strategies',
                excerpt: 'Discover effective strategies to solve LeetCode problems and improve your problem-solving skills.',
                author: 'Admin',
                publishedAt: new Date('2024-01-20').toISOString(),
                readTime: 8,
                category: 'tips',
                tags: ['leetcode', 'algorithms'],
            },
            {
                slug: 'building-consistent-coding-habits',
                title: 'Building Consistent Coding Habits',
                excerpt: 'Tips and tricks to build and maintain consistent coding habits for long-term success.',
                author: 'Admin',
                publishedAt: new Date('2024-02-01').toISOString(),
                readTime: 6,
                category: 'productivity',
                tags: ['habits', 'motivation'],
            },
        ];

        return apiResponse.success({ blogs });
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        return apiResponse.internalError('Failed to fetch blog posts');
    }
}

export const dynamic = 'force-dynamic';
