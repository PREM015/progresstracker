import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * API Route: /api/export/history
 * 
 * @description Get export history for user
 * @created 2026-01-26
 */

// GET - Fetch export history
export async function GET(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const [exports, total] = await Promise.all([
      prisma.exportJob.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          format: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          errorMessage: true,
        },
      }),
      prisma.exportJob.count({ where: { userId: session.user.id } }),
    ]);

    logger.info('Export history fetched', { userId: session.user.id, count: exports.length });

    return NextResponse.json({
      success: true,
      data: exports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Export history fetch failed', {}, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new export
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { format = 'XLSX' } = body;

    // Create new export job
    const exportJob = await prisma.exportJob.create({
      data: {
        userId: session.user.id,
        format,
        status: 'PENDING',
      },
    });

    logger.info('Export job created', { jobId: exportJob.id, userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: exportJob,
    }, { status: 201 });
  } catch (error) {
    logger.error('Export job creation failed', {}, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';



