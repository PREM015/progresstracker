
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request, { params }: { params: { authorId: string } }) => {
    const { authorId } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // 1. Get author info
    const author = await prisma.user.findUnique({
        where: { id: authorId },
        select: {
            id: true,
            name: true,
            image: true,
            bio: true // Assuming bio exists on User
        }
    });

    if (!author) {
        return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    // 2. Get posts
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
                content: true // needed for reading time
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

    // 3. Process posts (reading time)
    const processedPosts = posts.map(post => {
        const wordCount = post.content ? post.content.split(/\s+/).length : 0;
        const readingTime = Math.ceil(wordCount / 200);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, ...rest } = post; // Exclude content from list response
        return { ...rest, readingTime };
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
