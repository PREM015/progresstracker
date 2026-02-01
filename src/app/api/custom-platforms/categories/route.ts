// src/app/api/custom-platforms/categories/route.ts
/**
 * Platform Categories Routes
 * 
 * GET /api/custom-platforms/categories - Get all available categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PlatformCategory } from '@prisma/client';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  UnauthorizedError,
  toApiError,
} from '@/lib/apiError';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/custom-platforms/categories' });

const ALLOWED_METHODS = ['GET', 'OPTIONS'];

// Category metadata with icons and colors
const CATEGORY_METADATA: Record<PlatformCategory, { 
  label: string; 
  description: string; 
  icon: string; 
  color: string;
  examples: string[];
}> = {
  DSA: {
    label: 'Data Structures & Algorithms',
    description: 'Problem-solving platforms focused on DSA and competitive programming',
    icon: '🧮',
    color: '#10B981',
    examples: ['LeetCode', 'CodeForces', 'HackerRank'],
  },
  GIT: {
    label: 'Version Control',
    description: 'Git hosting and code repository platforms',
    icon: '📦',
    color: '#6366F1',
    examples: ['GitHub', 'GitLab', 'Bitbucket'],
  },
  JOB: {
    label: 'Job & Career',
    description: 'Job boards, recruitment, and career development platforms',
    icon: '💼',
    color: '#F59E0B',
    examples: ['LinkedIn', 'Indeed', 'Naukri'],
  },
  LEARNING: {
    label: 'Learning & Courses',
    description: 'Online learning platforms and educational resources',
    icon: '📚',
    color: '#8B5CF6',
    examples: ['Coursera', 'Udemy', 'freeCodeCamp'],
  },
  HACKATHON: {
    label: 'Hackathons',
    description: 'Hackathon hosting and participation platforms',
    icon: '🏆',
    color: '#EF4444',
    examples: ['Devpost', 'MLH', 'Unstop'],
  },
  OPENSOURCE: {
    label: 'Open Source',
    description: 'Open source contribution and community platforms',
    icon: '🌍',
    color: '#06B6D4',
    examples: ['GSoC', 'Hacktoberfest', 'GSSoC'],
  },
  COMPANY: {
    label: 'Company Specific',
    description: 'Company-specific platforms and assessments',
    icon: '🏢',
    color: '#EC4899',
    examples: ['Google Kickstart', 'Meta Hacker Cup', 'Amazon'],
  },
  DESIGN: {
    label: 'Design',
    description: 'UI/UX design and creative platforms',
    icon: '🎨',
    color: '#F97316',
    examples: ['Dribbble', 'Behance', 'Figma Community'],
  },
  DATA_SCIENCE: {
    label: 'Data Science',
    description: 'Data science, ML, and analytics platforms',
    icon: '📊',
    color: '#14B8A6',
    examples: ['Kaggle', 'DataCamp', 'Analytics Vidhya'],
  },
  OTHER: {
    label: 'Other',
    description: 'Other platforms that don\'t fit into specific categories',
    icon: '📁',
    color: '#6B7280',
    examples: ['Personal projects', 'Custom tracking'],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

function errorResponse(error: unknown, requestId: string): NextResponse {
  const apiError = toApiError(error, requestId);
  apiError.log();

  return NextResponse.json(
    {
      success: false,
      error: apiError.message,
      code: apiError.code,
      details: apiError.details,
      timestamp: apiError.timestamp,
      requestId,
    },
    { 
      status: apiError.statusCode,
      headers: { 'X-Request-ID': requestId },
    }
  );
}

function successResponse<T>(
  data: T, 
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

// =============================================================================
// GET - Get All Categories
// =============================================================================

export async function GET(req: NextRequest) {
  const { requestId } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 2. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:categories:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 3. Get category usage counts for the user
    const categoryCounts = await prisma.customPlatform.groupBy({
      by: ['category'],
      where: { userId },
      _count: true,
    });

    const categoryCountMap = new Map(
      categoryCounts.map(c => [c.category, c._count])
    );

    // 4. Build categories response with metadata and counts
    const categories = Object.entries(PlatformCategory).map(([key, value]) => {
      const metadata = CATEGORY_METADATA[value as PlatformCategory];
      return {
        id: value,
        key,
        ...metadata,
        platformCount: categoryCountMap.get(value as PlatformCategory) || 0,
      };
    });

    // 5. Sort by usage count (most used first), then alphabetically
    categories.sort((a, b) => {
      if (b.platformCount !== a.platformCount) {
        return b.platformCount - a.platformCount;
      }
      return a.label.localeCompare(b.label);
    });

    // 6. Get summary stats
    const totalPlatforms = await prisma.customPlatform.count({
      where: { userId },
    });

    const activePlatforms = await prisma.customPlatform.count({
      where: { userId, isActive: true },
    });

    const duration = Date.now() - startTime;
    log.info('Categories fetched', { userId, duration });

    return successResponse(
      {
        categories,
        summary: {
          totalCategories: categories.length,
          categoriesInUse: categoryCounts.length,
          totalPlatforms,
          activePlatforms,
        },
      },
      200,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// OPTIONS - Return allowed methods
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}