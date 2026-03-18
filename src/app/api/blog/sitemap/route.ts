import { NextRequest, NextResponse } from "next/server";
import blogService from "@/services/blogService";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { posts } = await blogService.getPublished(1, 1000);
    
    // Simple sitemap generation
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NEXT_PUBLIC_APP_URL}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  ${posts.map(post => `
  <url>
    <loc>${process.env.NEXT_PUBLIC_APP_URL}/blog/${post.slug}</loc>
    <lastmod>${(post.updatedAt || post.createdAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=86400, stale-while-revalidate'
      }
    });
  } catch (error) {
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
