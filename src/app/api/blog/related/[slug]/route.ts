
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "5");

    // 1. Find source post
    const sourcePost = await prisma.blogPost.findUnique({
        where: { slug },
        select: { id: true, category: true, tags: true, title: true }
    });

    if (!sourcePost) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // 2. Find Candidates
    const candidates = await prisma.blogPost.findMany({
        where: {
            status: 'published',
            publishedAt: { lte: new Date() },
            id: { not: sourcePost.id },
            OR: [
                { category: sourcePost.category },
                { tags: { hasSome: sourcePost.tags } }
            ]
        },
        take: 20, // get more to score

    });

    // 3. Score
    const scoredData = candidates.map(post => {
        let score = 0;
        if (post.category === sourcePost.category) score += 40;
        const matchingTags = post.tags.filter(t => sourcePost.tags.includes(t));
        score += matchingTags.length * 20;
        return {
            post,
            score: Math.min(score, 100)
        };
    });

    // 4. Sort and limit
    scoredData.sort((a, b) => b.score - a.score);
    const topPosts = scoredData.slice(0, limit);

    const processedPosts = topPosts.map(item => {
        const { post, score } = item;
        const wordCount = post.content ? post.content.split(/\s+/).length : 0;
        const readingTime = Math.ceil(wordCount / 200);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, ...rest } = post;
        return {
            ...rest,
            readingTime,
            relevanceScore: score
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            sourcePost,
            relatedPosts: processedPosts
        }
    });
});
