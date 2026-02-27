
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling, unauthorizedError, validationError, notFoundError } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";

const removeBookmarkSchema = z.object({
    bookmarkId: z.string().optional(),
    type: z.enum(['goal', 'achievement', 'platform', 'post']).optional(),
    entityId: z.string().optional()
}).refine(
    data => data.bookmarkId || (data.type && data.entityId),
    { message: "Must provide either bookmarkId or both type and entityId" }
);

// POST/DELETE: Remove a bookmark
export const POST = withErrorHandling(async (req: Request) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return unauthorizedError();
    }

    const userId = session.user.id;
    let body;

    try {
        body = await req.json();
    } catch (e) {
        return validationError('Invalid JSON body');
    }

    const validation = removeBookmarkSchema.safeParse(body);
    if (!validation.success) {
        return validationError('Invalid request body', validation.error.errors);
    }

    const { bookmarkId, type, entityId } = validation.data;

    // Sanitize inputs
    const cleanBookmarkId = bookmarkId ? sanitizeText(bookmarkId) : undefined;
    const cleanType = type ? sanitizeText(type) : undefined;
    const cleanEntityId = entityId ? sanitizeText(entityId) : undefined;

    let deleted;

    if (cleanBookmarkId) {
        // Remove by bookmarkId
        deleted = await prisma.bookmark.deleteMany({
            where: {
                id: cleanBookmarkId,
                userId // Ensure user owns the bookmark
            }
        });
    } else if (cleanType && cleanEntityId) {
        // Remove by type + entityId
        deleted = await prisma.bookmark.deleteMany({
            where: {
                userId,
                entityType: cleanType,
                entityId: cleanEntityId
            }
        });
    }

    if (!deleted || deleted.count === 0) {
        return notFoundError('Bookmark not found');
    }

    return NextResponse.json({
        success: true,
        data: {
            message: 'Bookmark removed',
            deletedCount: deleted.count
        }
    });
});

export const DELETE = POST;

// HEAD: Check remove endpoint availability
export const HEAD = withErrorHandling(async (req: Request) => {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return new NextResponse(null, { status: 401 });
    }

    return new NextResponse(null, { status: 200 });
});

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'POST, DELETE, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'POST, DELETE, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
