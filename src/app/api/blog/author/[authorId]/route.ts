
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request, { params }: { params: Promise<{ authorId: string }> }) => {
    const { authorId } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const author = await prisma.user.findUnique({
        where: { id: authorId },
        select: {
            id: true,
            name: true,
            image: true,
            bio: true
        }
    });

    if (!author) {
        return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
            where: {
                authorId: authorId,
                status: 'published',
                publishedAt: { lte: new Date() }
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
                publishedAt: true,
                viewCount: true,
                readingTimeMinutes: true,
                wordCount: true
            }
        }),
        prisma.blogPost.count({
            where: {
                authorId: authorId,
                status: 'published',
                publishedAt: { lte: new Date() }
            }
        })
    ]);

    if (posts.length === 0 && total === 0) {
        return NextResponse.json({ error: "Author has no published posts" }, { status: 404 });
    }

    const processedPosts = posts.map(post => {
        const readingTime = post.readingTimeMinutes || (post.wordCount ? Math.ceil(post.wordCount / 200) : 1);
        return { ...post, readingTime };
    });

    return NextResponse.json({
        success: true,
        data: {
            author: {
                ...author,
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
