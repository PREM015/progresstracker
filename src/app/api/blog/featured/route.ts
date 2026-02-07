
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
        orderBy: { publishedAt: 'desc' }
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
            orderBy: { viewCount: 'desc' }
        });

        featured.push(...popular);
    }

    const processedPosts = featured.map(post => {
        const wordCount = post.content ? post.content.split(/\s+/).length : 0;
        const readingTime = Math.ceil(wordCount / 200);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, ...rest } = post;
        return {
            ...rest,
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

