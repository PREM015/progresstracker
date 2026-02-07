
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const posts = await prisma.blogPost.findMany({
        where: {
            status: 'published',
            publishedAt: { lte: new Date() }
        },
        select: {
            slug: true,
            publishedAt: true,
            updatedAt: true
        },
        orderBy: { publishedAt: 'desc' }
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    for (const post of posts) {
        const lastmod = (post.updatedAt || post.publishedAt).toISOString();
        xml += `
      <url>
        <loc>${siteUrl}/blog/${post.slug}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>
    `;
    }
    xml += '</urlset>';

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
