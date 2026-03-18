
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10");
  const excludeIds = searchParams.get("excludeIds")?.split(",") || [];

  const posts = await prisma.blogPost.findMany({
    where: {
      status: 'published',
      publishedAt: { lte: new Date() },
      id: excludeIds.length ? { notIn: excludeIds } : undefined
    },
    orderBy: { publishedAt: 'desc' },
    take: limit + 1, // Get one more to check hasMore
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
      likeCount: true,
      readingTimeMinutes: true,
      wordCount: true
    }
  });

  const hasMore = posts.length > limit;
  const resultPosts = hasMore ? posts.slice(0, limit) : posts;

  const now = new Date();
  const processedPosts = resultPosts.map(post => {
    const readingTime = post.readingTimeMinutes || (post.wordCount ? Math.ceil(post.wordCount / 200) : 1);

    // Check if new (within 7 days)
    const published = post.publishedAt ? new Date(post.publishedAt) : new Date();
    const diffTime = Math.abs(now.getTime() - published.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isNew = diffDays <= 7;

    return {
      ...post,
      authorName: post.authorName,
      authorAvatar: null, // BlogPost doesn't have authorAvatar field
      readingTime,
      isNew
    };
  });

  const oldestDate = resultPosts.length > 0 ? resultPosts[resultPosts.length - 1].publishedAt : null;

  return NextResponse.json({
    success: true,
    data: {
      posts: processedPosts,
      hasMore,
      oldestDate
    }
  });
});

// HEAD: Quick check for recent posts
export const HEAD = withErrorHandling(async (req: Request) => {
  const count = await prisma.blogPost.count({
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
      'X-Post-Count': count.toString(),
      'X-Latest-Post-Date': latestPost?.publishedAt?.toISOString() || '',
    },
  });
});

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=600',
    },
  });
}

