import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiResponse } from '@/lib/apiResponse';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

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

        // TODO: Send actual email invitations here using sendEmail or queue
        // for (const email of emails) {
        //   await sendEmail({ to: email, template: 'waitlist-invite' });
        // }

        return apiResponse.success({ message: `Invited ${emails.length} users` });
    } catch (error) {
        return apiResponse.error(error);
    }
}
