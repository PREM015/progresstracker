
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling, unauthorizedError, validationError, notFoundError } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";

import { sanitizeText } from "@/lib/sanitize";

// GET: Get all bookmarks for authenticated user
export const GET = withErrorHandling(async (req: Request) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return unauthorizedError();
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const rawType = searchParams.get('type') || 'all';
    const type = sanitizeText(rawType);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };
    if (type !== 'all') {
        where.entityType = type;
    }

    const [bookmarks, total] = await Promise.all([
        prisma.bookmark.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.bookmark.count({ where })
    ]);

    // Resolve entity data for each bookmark
    const enrichedBookmarks = await Promise.all(bookmarks.map(async (bookmark) => {
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

        return {
            ...bookmark,
            entity
        };
    }));

    return NextResponse.json({
        success: true,
        data: {
            bookmarks: enrichedBookmarks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    });
});

// POST: Add a bookmark (redirects to /bookmarks/add for clarity)
export const POST = withErrorHandling(async (req: Request) => {
    return NextResponse.json({
        error: "Use POST /api/bookmarks/add to add bookmarks"
    }, { status: 400 });
});

// HEAD: Check bookmark availability
export const HEAD = withErrorHandling(async (req: Request) => {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return new NextResponse(null, { status: 401 });
    }

    const count = await prisma.bookmark.count({
        where: { userId: session.user.id }
    });

    return new NextResponse(null, {
        status: 200,
        headers: {
            'X-Feature-Status': 'enabled',
            'X-Bookmark-Count': count.toString(),
        },
    });
});

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
