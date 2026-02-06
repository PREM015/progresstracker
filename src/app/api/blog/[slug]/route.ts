import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import apiResponse from '@/lib/apiResponse';

export async function GET(
    request: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const slug = params.slug;

        // Mock blog post - replace with database query
        const blogPosts: Record<string, any> = {
            'getting-started-with-progress-tracking': {
                slug: 'getting-started-with-progress-tracking',
                title: 'Getting Started with Progress Tracking',
                content: '<p>Welcome to the world of progress tracking! This guide will help you get started...</p>',
                author: {
                    name: 'Admin',
                    avatar: '/avatar.png',
                },
                publishedAt: new Date('2024-01-15').toISOString(),
                updatedAt: new Date('2024-01-15').toISOString(),
                readTime: 5,
                category: 'tutorials',
                tags: ['beginners', 'guides'],
            },
            'mastering-leetcode-strategies': {
                slug: 'mastering-leetcode-strategies',
                title: 'Mastering LeetCode: Proven Strategies',
                content: '<p>LeetCode is a great platform for improving your coding skills...</p>',
                author: {
                    name: 'Admin',
                    avatar: '/avatar.png',
                },
                publishedAt: new Date('2024-01-20').toISOString(),
                updatedAt: new Date('2024-01-20').toISOString(),
                readTime: 8,
                category: 'tips',
                tags: ['leetcode', 'algorithms'],
            },
        };

        const post = blogPosts[slug];

        if (!post) {
            return apiResponse.notFound('Blog post');
        }

        return apiResponse.success({ post });
    } catch (error) {
        console.error('Error fetching blog post:', error);
        return apiResponse.internalError('Failed to fetch blog post');
    }
}

export const dynamic = 'force-dynamic';
