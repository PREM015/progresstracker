
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

    // We are matching category by slug.
    // Since we assume 'category' field in DB is the name, we probably need exact match or case insensitive.
    // If slug is 'next-js', category might be 'Next.js' or 'next-js'.
    // We'll try to find posts where category roughly matches.
    // Ideally we should have a Category model.
    // We will assume exact match on category field for now, or try to decode the slug.
    // BUT the route notes said: "const posts = await prisma.blogPost.findMany({ where: { category: slug ... } })"
    // So we will just use the slug as the category value.

    // NOTE: If slug is URL-encoded (e.g. Next.js -> next-js), this exact match might fail if stored as "Next.js".
    // Assuming the DB stores the slugified version or we pass the exact string.

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
        // Check if it's a valid category but empty?
        // Hard without a Category table.
        return NextResponse.json({ error: "Category not found or empty" }, { status: 404 });
    }

    const processedPosts = posts.map(post => {
        // Reading time approx
        const wordCount = post.content ? post.content.split(/\s+/).length : 0; // content not selected in first query?
        // Wait, I didn't select content. Prisma `include` includes all scalars by default.
        const readingTime = Math.ceil(wordCount / 200);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, ...rest } = post;
        return {
            ...rest,

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
