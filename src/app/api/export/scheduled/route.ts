import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**\n * API Route: /api/export/scheduled
 * 
 * @description Manage scheduled exports
 * @created 2026-01-26
 */

const scheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  format: z.enum(['XLSX', 'XML', 'CSV']),
  templateId: z.string().optional(),
});

// GET - Fetch scheduled exports
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

    const [schedules, total] = await Promise.all([
      prisma.scheduledExport.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }).catch(() => []),
      prisma.scheduledExport.count({
        where: { userId: session.user.id },
      }).catch(() => 0),
    ]);

    logger.info('Scheduled exports fetched', { userId: session.user.id, count: schedules.length });

    return NextResponse.json({
      success: true,
      data: schedules,
      pagination: { page, limit, total },
    });
  } catch (error) {
    logger.error('Failed to fetch scheduled exports', {}, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create scheduled export
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
    const validation = scheduleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { frequency, format, templateId } = validation.data;

    // Create scheduled export
    const schedule = await prisma.scheduledExport.create({
      data: {
        userId: session.user.id,
        frequency,
        format,
        templateId,
        isActive: true,
      } as any,
    }).catch(() => null);

    if (!schedule) {
      return NextResponse.json(
        { error: 'Failed to create schedule' },
        { status: 500 }
      );
    }

    logger.info('Scheduled export created', { scheduleId: schedule.id, userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: schedule,
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create scheduled export', {}, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';



