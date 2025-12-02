import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()),
});

// POST bulk delete
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = bulkDeleteSchema.parse(body);

    await prisma.trackerEntry.deleteMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error('Error bulk deleting entries:', error);
    return NextResponse.json(
      { error: 'Failed to delete entries' },
      { status: 500 }
    );
  }
}