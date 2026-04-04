import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';

import { adminAuth } from '@/middleware/adminAuth';

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
    // 1. Admin Auth Check
    const authError = await adminAuth(request);
    if (authError) return authError;

    // Placeholder for adding credits
    return NextResponse.json({ message: 'Use /api/stripe/credits POST instead or implement product purchase' }, { status: 501, headers: SECURITY_HEADERS });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
