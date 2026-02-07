
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper to escape XML special chars
function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    // format param ignored, defaulting to RSS for now as per simple impl

    const posts = await prisma.blogPost.findMany({
        where: {
            status: 'published',
            publishedAt: { lte: new Date() },
            category: category || undefined
        },
        orderBy: { publishedAt: 'desc' },
        take: limit
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    const lastBuildDate = new Date().toUTCString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Progress Tracker Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Latest posts from Progress Tracker</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/api/blog/feed" rel="self" type="application/rss+xml"/>`;

    for (const post of posts) {
        const postUrl = `${siteUrl}/blog/${post.slug}`;
        const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : new Date().toUTCString();

        xml += `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <description>${escapeXml(post.excerpt || '')}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${postUrl}</guid>
      ${post.category ? `<category>${escapeXml(post.category)}</category>` : ''}
    </item>`;
    }

    xml += `
  </channel>
</rss>`;

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

// HEAD: Quick feed availability check
export async function HEAD(req: Request) {
    const postCount = await prisma.blogPost.count({
        where: {
            status: 'published',
            publishedAt: { lte: new Date() }
        }
    });

    const latestPost = await prisma.blogPost.findFirst({
        where: {
            status: 'published',
            publishedAt: { lte: new Date() }
        },
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true }
    });

    return new NextResponse(null, {
        status: 200,
        headers: {
            'X-Post-Count': postCount.toString(),
            'X-Latest-Post-Date': latestPost?.publishedAt?.toISOString() || '',
            'Content-Type': 'application/rss+xml; charset=utf-8',
        },
    });
}

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}

