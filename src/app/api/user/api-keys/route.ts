/**
 * ============================================================================
 * API KEYS ROUTE
 * ============================================================================
 * Handles the creation and listing of API Keys for the authenticated user.
 * 
 * Methods implemented:
 * - GET: Retrieves all API keys associated with the current user.
 * - POST: Creates a new API key with secure cryptographic hashing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * GET Handler
 * 
 * Fetches all API keys for the currently authenticated user.
 * This endpoint ensures we only return safe metadata about the API keys
 * (like ID, name, prefix, scopes) and NEVER the full key hash or actual key.
 * 
 * @param request - The incoming Next.js HTTP request
 * @returns NextResponse with a list of API keys or error status
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
        }

        // 2. Query database for user's keys, omitting sensitive data like keyHash
        const apiKeys = await prisma.apiKey.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }, // Newest first
            select: {
                id: true,
                name: true,
                description: true,
                keyPrefix: true, // Only exposing the prefix, safe to display
                scopes: true,
                isActive: true,
                expiresAt: true,
                lastUsedAt: true,
                createdAt: true,
            }
        });

        // 3. Return the sanitized list of keys
        return NextResponse.json({ keys: apiKeys });
    } catch (error: any) {
        console.error('Failed to fetch API keys:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST Handler
 * 
 * Creates a new API key for the currently authenticated user.
 * The raw key is generated securely, hashed using SHA-256 for database storage,
 * and the raw key is ONLY returned once in this initial response.
 * 
 * @param request - The incoming Next.js HTTP request containing the key 'name'
 * @returns NextResponse with the newly created API key (including the raw key once)
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
        }

        // 2. Parse and validate request payload
        const body = await request.json();
        const { name } = body;

        // Basic validation to ensure a name is provided
        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Valid name is required for the API Key' }, { status: 400 });
        }

        // 3. Generate a secure random key
        // We use crypto.randomBytes to generate 32 bytes (256 bits) of entropy
        const rawKey = crypto.randomBytes(32).toString('hex');

        // Create a prefix so the user easily identifies the key type
        const keyPrefix = 'pk_test_' + rawKey.substring(0, 8);
        const fullKey = keyPrefix + '_' + rawKey.substring(8);

        // Hash the key using SHA-256. We NEVER store the raw key in the DB.
        const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

        // 4. Save the hashed key and metadata to the database
        const newKey = await prisma.apiKey.create({
            data: {
                userId: session.user.id,
                name,
                keyHash,       // Storing the hash
                keyPrefix,     // Storing the prefix for UI identification
                scopes: ['read', 'write'], // Default scopes for a new key
                isActive: true,
            },
        });

        // 5. Return success response
        // Includes the fullKey exactly once. The client must save it now.
        return NextResponse.json({
            key: {
                ...newKey,
                keyHash: undefined, // ensure we don't accidentally leak the hash
                key: fullKey,       // Send the raw key only once upon creation!
            }
        }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create API key:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
