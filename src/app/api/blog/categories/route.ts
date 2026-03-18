
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const includeEmpty = searchParams.get("includeEmpty") === "true";

  // Group by category to get counts
  const categoryStats = await prisma.blogPost.groupBy({
    by: ['category'],
    where: {
      status: 'published',
      publishedAt: { lte: new Date() },
      category: { not: null }
    },
    _count: { id: true },
    _max: { publishedAt: true }
  });

  // Since categories are strings in the model (based on grouping),
  // we map them to objects.
  // If there was a separate Category model, we would fetch that.
  // Assuming 'category' field in BlogPost is just a string slug or name.

  const categories = await Promise.all(categoryStats.map(async (stat) => {
    if (!stat.category) return null;

    // Get featured image from latest post in this category
    const latestPost = await prisma.blogPost.findFirst({
      where: {
        category: stat.category,
        status: 'published'
      },
      orderBy: { publishedAt: 'desc' },
      select: { featuredImage: true }
    });

    return {
      slug: stat.category.toLowerCase().replace(/\s+/g, '-'), // simplistic slugify
      name: stat.category,
      description: null, // No description if just a string field
      postCount: stat._count.id,
      latestPostDate: stat._max.publishedAt,
      featuredImage: latestPost?.featuredImage || null
    };
  }));

  const validCategories = categories.filter((c): c is NonNullable<typeof c> => c !== null);

  // If includeEmpty, we might need a fixed list of categories from config/constants
  // But here we can only query existing posts.

  return NextResponse.json({
    success: true,
    data: {
      categories: validCategories.sort((a, b) => b.postCount - a.postCount),
      totalCategories: validCategories.length,
      totalPosts: validCategories.reduce((acc, c) => acc + c.postCount, 0)
    }
  });
});

// HEAD: Check if categories are available (returns count in header)
export const HEAD = withErrorHandling(async (req: Request) => {
  const categoryCount = await prisma.blogPost.groupBy({
    by: ['category'],
    where: {
      status: 'published',
      publishedAt: { lte: new Date() },
      category: { not: null }
    }
  });

  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Total-Categories': categoryCount.length.toString(),
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

