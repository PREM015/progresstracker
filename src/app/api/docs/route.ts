import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API Route: /api/docs
 * 
 * @description OpenAPI/Swagger documentation endpoint
 * @created 2026-01-26
 */

// GET - Fetch OpenAPI schema
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return OpenAPI 3.0 schema for API documentation
    const openApiSchema = {
      openapi: '3.0.0',
      info: {
        title: 'Progress Tracker API',
        description: 'API for tracking progress across various platforms',
        version: '1.0.0',
        contact: {
          name: 'Support',
          url: process.env.NEXT_PUBLIC_APP_URL,
        },
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          description: 'Production server',
        },
      ],
      paths: {
        '/api/goals': {
          get: {
            summary: 'List goals',
            tags: ['Goals'],
            security: [{ bearerAuth: [] }],
          },
        },
        '/api/platforms': {
          get: {
            summary: 'List platforms',
            tags: ['Platforms'],
          },
        },
        '/api/leaderboard/global': {
          get: {
            summary: 'Get global leaderboard',
            tags: ['Leaderboard'],
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
    };

    return NextResponse.json({
      success: true,
      data: openApiSchema,
    });
  } catch (error) {
    console.error('[DOCS_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';



