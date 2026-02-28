
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // We need to match the slug to the tag name.
    // Since we don't have a Tag model, we assume the slug IS the tag or we search loosely.
    // If slug is "next-js", tag might be "Next.js".
    // For now, we search where tags array contains the slug (case insensitive if possible, but Prisma array contains is case sensitive usually).
    // We'll try exact match first.

    let [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
            where: {
                status: 'published',
                publishedAt: { lte: new Date() },
                tags: { has: slug }
            },
            orderBy: { publishedAt: 'desc' },
            skip,
            take: limit,
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
        }),
        prisma.blogPost.count({
            where: {
                status: 'published',
                publishedAt: { lte: new Date() },
                tags: { has: slug }
            }
        })
    ]);

    if (total === 0) {
        // Return 404 as per requirements
        return NextResponse.json({ error: "No posts found with this tag" }, { status: 404 });
    }

    const processedPosts = posts.map(post => {
        const readingTime = post.readingTimeMinutes || (post.wordCount ? Math.ceil(post.wordCount / 200) : 1);

        return {
            ...post,
            readingTime
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            tag: {
                slug,
                name: slug,
                postCount: total
            },
            posts: processedPosts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        }
    });
});
