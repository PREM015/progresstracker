
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";

// NOTE: Assumes BlogPostLike model and likeCount field exist

export const POST = withErrorHandling(async (req: Request, { params }: { params: { slug: string } }) => {
    // NOTE: BlogPostLike model is missing from schema.
    return NextResponse.json({ error: "Liking posts is currently disabled" }, { status: 501 });
});

export const GET = withErrorHandling(async (req: Request, { params }: { params: { slug: string } }) => {
    const { slug } = params;

    const post = await prisma.blogPost.findUnique({
        where: { slug },
        select: { id: true, likeCount: true } // likeCount exists on BlogPost
    });

    if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        data: {
            liked: false, // Cannot check if liked without join table
            likeCount: post.likeCount
        }
    });
});
