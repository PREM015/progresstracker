import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createEntrySchema = z.object({
  date: z.string().datetime(),
  platformId: z.string().optional(),
  problemsSolved: z.number().int().min(0).optional(),
  timeSpent: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// GET entries by date range
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const platform = searchParams.get('platform');

    const where: any = {
      userId: session.user.id,
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (platform) {
      where.platformId = platform;
    }

    const entries = await prisma.trackerEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    logger.error('Error fetching tracker entries:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

// POST new entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createEntrySchema.parse(body);

    const entry = await prisma.trackerEntry.create({
      data: {
        userId: session.user.id,
        date: new Date(validated.date),
        platformId: validated.platformId,
        problemsSolved: validated.problemsSolved || 0,
        timeSpent: validated.timeSpent || 0,
        notes: validated.notes,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error creating tracker entry:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    );
  }
}