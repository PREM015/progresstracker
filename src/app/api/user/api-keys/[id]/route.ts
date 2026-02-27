/**
 * ============================================================================
 * API KEY ID ROUTE
 * ============================================================================
 * Handles operations directed to a specific API Key ID.
 * 
 * Methods implemented:
 * - DELETE: Revokes and permanently deletes a specific API key belonging to the user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE Handler
 * 
 * Revokes an API Key by hard-deleting it from the database so it can no longer be used.
 * Validates ownership securely before deletion.
 * 
 * @param request - The incoming Next.js HTTP request
 * @param params - Contains dynamic route segments, e.g., the 'id' of the API Key
 * @returns NextResponse with a success boolean or error status
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authenticate user session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
        }

        // Await the params to extract the API key ID
        const { id } = await params;

        // 2. Fetch the existing key to verify it exists and belongs to the user
        const apiKey = await prisma.apiKey.findUnique({
            where: { id },
            select: { userId: true } // Only fetch what we need
        });

        // 3. Enforce security constraints
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        // Ensure users can only delete their own keys
        if (apiKey.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden. You do not own this API key.' }, { status: 403 });
        }

        // 4. Delete the key permanently
        await prisma.apiKey.delete({
            where: { id }
        });

        // 5. Respond successfully
        return NextResponse.json({ success: true, message: "API key successfully revoked." });
    } catch (error: any) {
        console.error('Failed to delete API key:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
