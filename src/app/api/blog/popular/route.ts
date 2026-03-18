
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";
import { subDays } from "date-fns"; // Assuming date-fns is available or use native

export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10");
  const period = searchParams.get("period") || "month";

  const now = new Date();
  let periodStart: Date;

  // Native date calculation to avoid dependency if date-fns not present
  switch (period) {
    case 'week':
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 7);
      break;
    case 'month':
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 30);
      break;
    case 'year':
      periodStart = new Date(now);
      periodStart.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      periodStart = new Date(0);
      break;
    default:
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 30);
  }

  const posts = await prisma.blogPost.findMany({
    where: {
      status: 'published',
      publishedAt: {
        gte: periodStart,
        lte: now
      }
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
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
  });

  const processedPosts = posts.map((post, index) => {
    const readingTime = post.readingTimeMinutes || (post.wordCount ? Math.ceil(post.wordCount / 200) : 1);

    return {
      ...post,
      authorName: post.authorName,
      readingTime,
      rank: index + 1
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      posts: processedPosts,
      period,
      totalPosts: posts.length
    }
  });
});

// HEAD: Quick check for popular posts availability
export const HEAD = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";

  const now = new Date();
  let periodStart: Date;

  switch (period) {
    case 'week':
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 7);
      break;
    case 'month':
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 30);
      break;
    case 'year':
      periodStart = new Date(now);
      periodStart.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      periodStart = new Date(0);
      break;
    default:
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 30);
  }

  const count = await prisma.blogPost.count({
    where: {
      status: 'published',
      publishedAt: {
        gte: periodStart,
        lte: now
      }
    }
  });

  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Post-Count': count.toString(),
      'X-Period': period,
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
      'Cache-Control': 'public, max-age=1800',
    },
  });
}

