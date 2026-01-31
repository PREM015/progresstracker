// src/app/api/admin/blog/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function checkAdminAuth(req: NextRequest) {
  const session = req.headers.get("x-admin-session");
  if (!session) {
    return null;
  }
  
  const user = await prisma.user.findFirst({
    where: { isAdmin: true },
    select: { id: true, email: true, isAdmin: true, name: true }
  });
  
  return user;
}

// GET /api/admin/blog - List all blog posts
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      logger.warn("Unauthorized blog access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
          { excerpt: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status }),
      ...(category && { category }),
    };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          featuredImage: true,
          category: true,
          tags: true,
          status: true,
          authorId: true,
          authorName: true,
          publishedAt: true,
          viewCount: true,
          likeCount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    logger.info("Blog posts fetched", {
      admin: admin.email,
      total,
      page,
      filters: { status, category },
    });

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching blog posts", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/blog - Create new blog post
export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      logger.warn("Unauthorized blog creation attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      slug,
      title,
      excerpt,
      content,
      featuredImage,
      metaTitle,
      metaDescription,
      category,
      tags = [],
      status = "draft",
    } = body;

    // Validation
    if (!slug || !title || !content) {
      return NextResponse.json(
        { error: "Slug, title, and content are required" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Blog post with this slug already exists" },
        { status: 409 }
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title,
        excerpt,
        content,
        featuredImage,
        metaTitle,
        metaDescription,
        category,
        tags,
        status,
        authorId: admin.id,
        authorName: admin.name || admin.email || "Admin",
        ...(status === "published" && {
          publishedAt: new Date(),
        }),
      },
    });

    logger.info("Blog post created", {
      admin: admin.email,
      postSlug: slug,
      postId: post.id,
      status,
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    logger.error("Error creating blog post", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}