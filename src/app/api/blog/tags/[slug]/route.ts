
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request, { params }: { params: { slug: string } }) => {
    const { slug } = params;
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
            include: { author: { select: { name: true } } }
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
        const wordCount = post.content ? post.content.split(/\s+/).length : 0;
        const readingTime = Math.ceil(wordCount / 200);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, ...rest } = post;
        return {
            ...rest,
            authorName: post.author?.name,
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
