import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiResponse } from '@/lib/apiResponse';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isAdmin) {
            return apiResponse.unauthorized();
        }

        const [total, pending, approved, joined] = await Promise.all([
            prisma.waitlist.count(),
            prisma.waitlist.count({ where: { status: 'waiting' } }),
            prisma.waitlist.count({ where: { status: 'invited' } }),
            prisma.waitlist.count({ where: { status: 'joined' } }),
        ]);

        const conversionRate = total > 0 ? (joined / total) * 100 : 0;

        return apiResponse.success({
            total,
            pending,
            approved,
            conversionRate,
        });
    } catch (error) {
        return apiResponse.error(error);
    }
}
