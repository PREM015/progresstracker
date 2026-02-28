
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "5");

    // Strategy: Manually featured (via tag 'featured') OR Popular fallback

    // 1. Try to get manually featured posts
    // Only where publishedAt is in the past
    const now = new Date();

    // Assuming 'tags' is string[]
    const featured = await prisma.blogPost.findMany({
        where: {
            status: 'published',
            publishedAt: { lte: now },
            tags: { has: 'featured' }
        },
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            featuredImage: true,
            category: true,
            tags: true,
            authorName: true,
            publishedAt: true,
            viewCount: true,
            readingTimeMinutes: true,
            wordCount: true
        }
    });

    // 2. Fallback to popular if not enough
    if (featured.length < limit) {
        const featuredIds = featured.map(p => p.id);
        const popular = await prisma.blogPost.findMany({
            where: {
                status: 'published',
                publishedAt: { lte: now },
                id: { notIn: featuredIds }
            },
            take: limit - featured.length,
            orderBy: { viewCount: 'desc' },
            select: {
                id: true,
                slug: true,
                title: true,
                excerpt: true,
                featuredImage: true,
                category: true,
                tags: true,
                authorName: true,
                publishedAt: true,
                viewCount: true,
                readingTimeMinutes: true,
                wordCount: true
            }
        });

        featured.push(...popular);
    }

    const processedPosts = featured.map(post => {
        // Use readingTimeMinutes if available, fallback to wordCount calculation if not
        const readingTime = post.readingTimeMinutes || (post.wordCount ? Math.ceil(post.wordCount / 200) : 1);

        return {
            ...post,
            authorName: post.authorName,
            readingTime,
            isFeatured: post.tags.includes('featured')
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            posts: processedPosts
        }
    });
});

// HEAD: Check featured posts availability
export const HEAD = withErrorHandling(async (req: Request) => {
    const featuredCount = await prisma.blogPost.count({
        where: {
            status: 'published',
            publishedAt: { lte: new Date() },
            tags: { has: 'featured' }
        }
    });

    return new NextResponse(null, {
        status: 200,
        headers: {
            'X-Featured-Count': featuredCount.toString(),
        },
    });
});

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Cache-Control': 'public, max-age=1800',
        },
    });
}

