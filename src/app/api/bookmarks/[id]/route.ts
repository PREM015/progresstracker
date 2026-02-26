
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling, unauthorizedError, notFoundError, forbiddenError } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";

// GET: Get specific bookmark details
export const GET = withErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return unauthorizedError();
    }

    const userId = session.user.id;
    const bookmarkId = (await params).id;

    const bookmark = await prisma.bookmark.findUnique({
        where: { id: bookmarkId }
    });

    if (!bookmark) {
        return notFoundError('Bookmark not found');
    }

    if (bookmark.userId !== userId) {
        return forbiddenError('You do not own this bookmark');
    }

    // Resolve entity data
    let entity = null;
    try {
        switch (bookmark.entityType) {
            case 'goal':
                entity = await prisma.goal.findUnique({
                    where: { id: bookmark.entityId },
                    select: { id: true, title: true, status: true, category: true }
                });
                break;
            case 'achievement':
                entity = await prisma.achievement.findUnique({
                    where: { id: bookmark.entityId },
                    select: { id: true, title: true, tier: true, icon: true }
                });
                break;
            case 'platform':
                entity = await prisma.platform.findUnique({
                    where: { id: bookmark.entityId },
                    select: { id: true, name: true, category: true, icon: true }
                });
                break;
            case 'post':
                entity = await prisma.blogPost.findUnique({
                    where: { id: bookmark.entityId },
                    select: { id: true, title: true, slug: true, excerpt: true }
                });
                break;
        }
    } catch (e) {
        // Entity might have been deleted
    }

    return NextResponse.json({
        success: true,
        data: {
            bookmark: {
                ...bookmark,
                entity
            }
        }
    });
});

// DELETE: Delete specific bookmark
export const DELETE = withErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return unauthorizedError();
    }

    const userId = session.user.id;
    const bookmarkId = (await params).id;

    const bookmark = await prisma.bookmark.findUnique({
        where: { id: bookmarkId }
    });

    if (!bookmark) {
        return notFoundError('Bookmark not found');
    }

    if (bookmark.userId !== userId) {
        return forbiddenError('You do not own this bookmark');
    }

    await prisma.bookmark.delete({
        where: { id: bookmarkId }
    });

    return NextResponse.json({
        success: true,
        data: {
            message: 'Bookmark deleted'
        }
    });
});

// HEAD: Check bookmark existence
export const HEAD = withErrorHandling(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return new NextResponse(null, { status: 401 });
    }

    const userId = session.user.id;
    const bookmarkId = (await params).id;

    const bookmark = await prisma.bookmark.findUnique({
        where: { id: bookmarkId }
    });

    if (!bookmark) {
        return new NextResponse(null, { status: 404 });
    }

    if (bookmark.userId !== userId) {
        return new NextResponse(null, { status: 403 });
    }

    return new NextResponse(null, {
        status: 200,
        headers: {
            'X-Entity-Type': bookmark.entityType,
        },
    });
});

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'GET, DELETE, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'GET, DELETE, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
