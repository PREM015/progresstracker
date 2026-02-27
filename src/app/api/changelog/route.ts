/**
 * ============================================================================
 * PUBLIC CHANGELOG API ENDPOINT
 * ============================================================================
 * Fetches the application's changelog to display updates, features, and fixes 
 * to the end-users. This acts as a read-only endpoint pointing to the Prisma DB.
 * 
 * Methods implemented:
 * - GET: Retrieves a paginated list of published changelog entries.
 * - OPTIONS: Handles CORS preflight requests securely.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET Handler
 * 
 * Fetches the latest published changelog entries from the database.
 * 
 * @returns NextResponse containing an array of 'versions' or a 500 error on DB failure
 */
export async function GET() {
    try {
        // 1. Query the database for changelog notes
        // We strictly filter for features marked as 'isPublished' to true
        // ensuring we don't leak internal draft notes to the public.
        const versions = await prisma.changelogEntry.findMany({
            where: {
                isPublished: true
            },
            // 2. Sort by the published date descending so users see the latest first
            orderBy: {
                publishedAt: 'desc'
            },
            // 3. Limit to the 50 most recent records to prevent huge payloads
            // (Pagination could be added here later using skip/take cursor logic)
            take: 50
        });

        // 4. Return the queried versions with a 200 OK status
        return NextResponse.json({ versions });
    } catch (error) {
        // 5. Handle potential database connection failures gracefully
        console.error('Failed to fetch changelog:', error);

        // Return an empty array on failure so the UI doesn't crash, 
        // accompanied by a 500 status code indicating server fault
        return NextResponse.json({ versions: [] }, { status: 500 });
    }
}

/**
 * OPTIONS Handler
 * 
 * Responds to preflight browser CORS checking requests prior to an actual GET.
 * Returning 204 No Content validates the route is reachable.
 */
export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
