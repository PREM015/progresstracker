import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
    response.headers.set('X-Request-ID', requestId);
    return response;
}

// Temporary static content or fetch from MD file/DB
// For now, returning placeholders.

const LEGAL_DOCS: Record<string, any> = {
    'tos': {
        title: 'Terms of Service',
        content: '# Terms of Service\n\nWelcome to ProgressTracker...',
        updatedAt: new Date().toISOString()
    },
    'privacy': {
        title: 'Privacy Policy',
        content: '# Privacy Policy\n\nYour privacy is important to us...',
        updatedAt: new Date().toISOString()
    },
    'cookies': {
        title: 'Cookie Policy',
        content: '# Cookie Policy\n\nWe use cookies...',
        updatedAt: new Date().toISOString()
    }
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }): Promise<NextResponse> {
    const requestId = generateRequestId();

    try {
        const { type: rawType } = await params;
        const type = rawType.toLowerCase();
        const doc = LEGAL_DOCS[type];

        if (!doc) {
            return addHeaders(apiResponse.notFound('Document not found', requestId), requestId);
        }

        return addHeaders(apiResponse.success(doc, { meta: { requestId } }), requestId);

    } catch (error) {
        logger.error('GET legal doc failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
