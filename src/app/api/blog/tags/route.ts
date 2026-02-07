
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    // sortBy count or name

    // Application-level aggregation for compatibility
    const posts = await prisma.blogPost.findMany({
        where: { status: 'published', publishedAt: { lte: new Date() } },
        select: { tags: true }
    });

    const tagMap = new Map<string, number>();
    posts.forEach(p => {
        if (Array.isArray(p.tags)) {
            p.tags.forEach(t => {
                tagMap.set(t, (tagMap.get(t) || 0) + 1);
            });
        }
    });

    const tags = Array.from(tagMap.entries())
        .map(([name, count]) => ({
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

    return NextResponse.json({
        success: true,
        data: {
            tags,
            totalTags: tagMap.size,
            totalPosts: posts.length
        }
    });
});
