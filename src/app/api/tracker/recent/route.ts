
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/apiResponse";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return apiResponse.unauthorized();
        }

        const { searchParams } = new URL(req.url);
        const validation = querySchema.safeParse({
            limit: searchParams.get("limit") || "10",
        });

        if (!validation.success) {
            return apiResponse.validationError("Invalid query parameters", validation.error.errors);
        }

        const { limit } = validation.data;

        const entries = await prisma.trackerEntry.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                date: 'desc',
            },
            take: limit,
            select: {
                id: true,
                date: true,
                platformId: true,
                category: true,
                problemsSolved: true,
                commits: true,
                pullRequests: true,
                timeSpent: true,
                points: true,
                notes: true,
                source: true,
                platform: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        icon: true,
                        color: true,
                    }
                }
            }
        });

        return apiResponse.success(entries);
    } catch (error) {
        return apiResponse.error(error);
    }
}
