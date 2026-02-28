
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "publishedAt";
    const order = searchParams.get("order") || "desc";
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
            where: {
                category: slug,
                status: 'published',
                publishedAt: { lte: new Date() }
            },
            orderBy: { [sortBy]: order as 'asc' | 'desc' },
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
                category: slug,
                status: 'published',
                publishedAt: { lte: new Date() }
            }
        })
    ]);

    if (total === 0) {
        return NextResponse.json({ error: "Category not found or empty" }, { status: 404 });
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
            category: {
                slug,
                name: slug,
                description: null,
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
