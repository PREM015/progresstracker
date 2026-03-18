
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/apiHandler";
import { Prisma } from "@prisma/client";

export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const category = searchParams.get("category");
  const tags = searchParams.get("tags")?.split(",").filter(Boolean);
  const author = searchParams.get("author"); // authorId
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "publishedAt";
  const order = searchParams.get("order") || "desc";

  const where: Prisma.BlogPostWhereInput = {
    status: 'published',
    publishedAt: { lte: new Date() }
  };

  if (category) {
    where.category = category;
  }

  if (author) {
    where.authorId = author;
  }

  if (dateFrom || dateTo) {
    where.publishedAt = {
      ...((where.publishedAt as Prisma.DateTimeFilter) || {}),
      gte: dateFrom ? new Date(dateFrom) : undefined,
      lte: dateTo ? new Date(dateTo) : new Date()
    };
  }

  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { [sortBy]: order as 'asc' | 'desc' },
      skip,
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
    }),
    prisma.blogPost.count({ where })
  ]);

  const processedPosts = posts.map(post => {
    const readingTime = post.readingTimeMinutes || (post.wordCount ? Math.ceil(post.wordCount / 200) : 1);
    return {
      ...post,
      readingTime
    };
  });

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
      appliedFilters: {
        category: category || null,
        tags: tags || null,
        author: author || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        search: search || null,
        sortBy,
        order
      }
    }
  });
});
