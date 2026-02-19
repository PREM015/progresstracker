
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const enumValues = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"AuditAction")) as value;
    `;
        return NextResponse.json({ enumValues });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
