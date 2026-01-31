// src/app/api/public/blog/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/public/blog/[slug] - Get single published blog post by slug (public)
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const post = await prisma.blogPost.findFirst({
      where: {
        slug: params.slug,
        status: "published",
        publishedAt: { lte: new Date() },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    // Increment view count (async, don't await)
    prisma.blogPost
      .update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((error) => {
        logger.error("Error incrementing blog post view count", { slug: params.slug }, error);
      });

    logger.info("Public blog post fetched", {
      slug: params.slug,
      postId: post.id,
    });

    return NextResponse.json(post);
  } catch (error) {
    logger.error("Error fetching public blog post", { slug: params.slug }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/public/blog/[slug] - Like a blog post (public)
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action !== "like") {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const post = await prisma.blogPost.findFirst({
      where: {
        slug: params.slug,
        status: "published",
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    // Increment like count
    const updated = await prisma.blogPost.update({
      where: { id: post.id },
      data: { likeCount: { increment: 1 } },
      select: {
        id: true,
        slug: true,
        likeCount: true,
      },
    });

    logger.info("Blog post liked", {
      slug: params.slug,
      postId: post.id,
      newLikeCount: updated.likeCount,
    });

    return NextResponse.json({
      success: true,
      likeCount: updated.likeCount,
    });
  } catch (error) {
    logger.error("Error liking blog post", { slug: params.slug }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}    