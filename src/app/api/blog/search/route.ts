
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, validationError } from "@/lib/apiHandler";
import { sanitizeSearchQuery } from "@/lib/sanitize";

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "10");
  const page = parseInt(searchParams.get("page") || "1");
  const category = searchParams.get("category");
  const highlight = searchParams.get("highlight") === "true";

  // Sanitize search query
  const q = rawQuery ? sanitizeSearchQuery(rawQuery) : '';

  if (!q || q.length < 2) {
    return validationError('Search query must be at least 2 characters');
  }

  const skip = (page - 1) * limit;

  // Simple LIKE search
  const where: any = {
    status: 'published',
    publishedAt: { lte: new Date() },
    OR: [
      { title: { contains: q, mode: 'insensitive' as const } },
      { content: { contains: q, mode: 'insensitive' as const } },
      { excerpt: { contains: q, mode: 'insensitive' as const } },
      { tags: { has: q } } // Exact match for tags
    ]
  };

  if (category) {
    where.category = category;
  }

  const startTime = Date.now();

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: 'desc' },
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
        readingTimeMinutes: true,
        wordCount: true
      }
    }),
    prisma.blogPost.count({ where })
  ]);

  const duration = Date.now() - startTime;

  const processedPosts = posts.map(post => {
    let highlightedExcerpt = post.excerpt || "";
    let highlightedTitle = post.title;
    let matchScore = 0;

    if (post.title.toLowerCase().includes(q.toLowerCase())) matchScore += 50;
    if (post.tags.includes(q)) matchScore += 30;
    if (post.excerpt?.toLowerCase().includes(q.toLowerCase())) matchScore += 20;

    if (highlight) {
      const regex = new RegExp(`(${escapeRegex(q)})`, 'gi');
      if (post.excerpt) highlightedExcerpt = post.excerpt.replace(regex, '<mark>$1</mark>');
      highlightedTitle = post.title.replace(regex, '<mark>$1</mark>');
    }

    const readingTime = post.readingTimeMinutes || (post.wordCount ? Math.ceil(post.wordCount / 200) : 1);

    return {
      ...post,
      highlightedExcerpt,
      highlightedTitle,
      readingTime,
      matchScore
    };
  });

  // Sort by score manually since we can't easily do it in Prisma without raw SQL ts_vector
  processedPosts.sort((a, b) => b.matchScore - a.matchScore);

  return NextResponse.json({
    success: true,
    data: {
      posts: processedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      },
      query: q,
      searchTime: duration
    }
  });
});

// HEAD: Quick search availability check
export const HEAD = withErrorHandling(async (req: Request) => {
  const totalPosts = await prisma.blogPost.count({
    where: {
      status: 'published',
      publishedAt: { lte: new Date() }
    }
  });

  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Total-Posts': totalPosts.toString(),
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
    },
  });
}

