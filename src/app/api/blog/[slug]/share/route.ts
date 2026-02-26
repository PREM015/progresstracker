
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;

    const post = await prisma.blogPost.findUnique({
        where: { slug },
        select: { title: true, excerpt: true, featuredImage: true }
    });

    if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    const postUrl = `${siteUrl}/blog/${slug}`;
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedTitle = encodeURIComponent(post.title);
    const encodedDesc = encodeURIComponent(post.excerpt || '');

    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
        hackernews: `https://news.ycombinator.com/submitlink?u=${encodedUrl}&t=${encodedTitle}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
        copy: postUrl
    };

    return NextResponse.json({
        success: true,
        data: {
            post: {
                slug,
                title: post.title,
                url: postUrl
            },
            meta: {
                title: post.title,
                description: post.excerpt,
                image: post.featuredImage
            },
            shareLinks
        }
    });
});

export const POST = withErrorHandling(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
    // Optional analytics tracking for shares
    // req.body: { platform: string }
    return NextResponse.json({ success: true });
});
