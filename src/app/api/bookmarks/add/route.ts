
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling, unauthorizedError, validationError, notFoundError, conflictError } from "@/lib/apiHandler";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";

const addBookmarkSchema = z.object({
    type: z.enum(['goal', 'achievement', 'platform', 'post']),
    entityId: z.string().min(1)
});

// POST: Add a bookmark
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

    const validation = addBookmarkSchema.safeParse(body);
    if (!validation.success) {
        return validationError('Invalid request body', validation.error.errors);
    }

    const { type, entityId } = validation.data;

    // Sanitize inputs
    const cleanType = sanitizeText(type);
    const cleanEntityId = sanitizeText(entityId);

    // Verify entity exists
    let entityExists = false;
    try {
        switch (cleanType) {
            case 'goal':
                const goal = await prisma.goal.findUnique({ where: { id: cleanEntityId } });
                entityExists = !!goal;
                break;
            case 'achievement':
                const achievement = await prisma.achievement.findUnique({ where: { id: cleanEntityId } });
                entityExists = !!achievement;
                break;
            case 'platform':
                const platform = await prisma.platform.findUnique({ where: { id: cleanEntityId } });
                entityExists = !!platform;
                break;
            case 'post':
                const post = await prisma.blogPost.findUnique({ where: { id: cleanEntityId } });
                entityExists = !!post;
                break;
        }
    } catch (e) {
        return notFoundError(`${cleanType} not found`);
    }

    if (!entityExists) {
        return notFoundError(`${cleanType} with id ${cleanEntityId} not found`);
    }

    // Check for duplicate
    const existing = await prisma.bookmark.findUnique({
        where: {
            userId_entityType_entityId: {
                userId,
                entityType: cleanType,
                entityId: cleanEntityId
            }
        }
    });

    if (existing) {
        return conflictError('Bookmark already exists');
    }

    // Create bookmark
    const bookmark = await prisma.bookmark.create({
        data: {
            userId,
            entityType: cleanType,
            entityId: cleanEntityId
        }
    });

    return NextResponse.json({
        success: true,
        data: {
            bookmark
        }
    }, { status: 201 });
});

// HEAD: Check if bookmarking is available
export const HEAD = withErrorHandling(async (req: Request) => {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return new NextResponse(null, { status: 401 });
    }

    return new NextResponse(null, {
        status: 200,
        headers: {
            'X-Feature-Status': 'enabled',
        },
    });
});

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'POST, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'POST, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
