import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiResponse } from '@/lib/apiResponse';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isAdmin) {
            return apiResponse.unauthorized();
        }

        const { emails } = await req.json();

        if (!Array.isArray(emails) || emails.length === 0) {
            return apiResponse.validationError('Emails are required');
        }

        // Update status to invited
        await prisma.waitlist.updateMany({
            where: { email: { in: emails } },
            data: {
                status: 'invited',
                invitedAt: new Date(),
            },
        });

        try {
            const { sendEmail } = await import('@/lib/email');
            for (const email of emails) {
                await sendEmail({
                    to: email,
                    subject: 'You are invited!',
                    html: `<p>We are excited to invite you to join us!</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/invite?email=${encodeURIComponent(email)}">Join Now</a></p>`,
                });
            }
        } catch (emailErr) {
            logger.warn('Failed to send invite emails', { count: emails.length, error: String(emailErr) });
        }

        return apiResponse.success({ message: `Invited ${emails.length} users` });
    } catch (error) {
        return apiResponse.error(error);
    }
}
