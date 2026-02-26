/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/email-admin.ts
import { Resend } from 'resend';
import { prisma } from './prisma';
import { logger } from './logger';
import { render } from '@react-email/components';
import { NotificationEmail } from '@/emails/notification-email';


if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set');
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@yourdomain.com';
const FROM_NAME = process.env.FROM_NAME || 'Your App';

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  react?: React.ReactElement;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const { to, subject, html, react, text, replyTo, cc, bcc, attachments } = options;

    const emailHtml = react ? await render(react) : html;

    const payload: any = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      replyTo,
      cc,
      bcc,
      attachments,
    };

    if (emailHtml) payload.html = emailHtml;
    if (text) payload.text = text;

    const result = await resend.emails.send(payload);

    logger.info('Email sent successfully', {
      to: Array.isArray(to) ? to.length : 1,
      subject,
      emailId: result.data?.id,
    });

    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (error) {
    logger.error('Email send failed', { to: options.to }, error);
    throw error;
  }
}

// =============================================================================
// BATCH EMAIL SENDING
// =============================================================================

export interface BatchEmailOptions {
  recipients: Array<{
    email: string;
    name?: string;
    variables?: Record<string, string>;
  }>;
  subject: string;
  template: string;
  defaultVariables?: Record<string, string>;
  batchSize?: number;
}

export async function sendBatchEmails(options: BatchEmailOptions) {
  const { recipients, subject, template, defaultVariables = {}, batchSize = 100 } = options;

  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>,
  };

  // Process in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const promises = batch.map(async (recipient) => {
      try {
        // Replace variables in template
        let emailHtml = template;
        const variables = { ...defaultVariables, ...recipient.variables };

        Object.entries(variables).forEach(([key, value]) => {
          emailHtml = emailHtml.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });

        await sendEmail({
          to: recipient.email,
          subject,
          html: emailHtml,
        });

        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        logger.error('Batch email failed', { email: recipient.email }, error);
      }
    });

    await Promise.all(promises);

    // Add delay between batches to respect rate limits
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  logger.info('Batch email completed', results);

  return results;
}

// =============================================================================
// NOTIFICATION EMAIL SENDER
// =============================================================================

export interface NotificationEmailData {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export async function sendNotificationEmail(
  userEmail: string,
  userName: string,
  data: NotificationEmailData
) {
  try {
    await sendEmail({
      to: userEmail,
      subject: data.title,
      react: NotificationEmail({
        userName,
        ...data,
      }),
    });

    return { success: true };
  } catch (error) {
    logger.error('Notification email failed', { userEmail }, error);
    throw error;
  }
}

// =============================================================================
// BROADCAST EMAIL
// =============================================================================

export async function broadcastEmail(
  userIds: string[],
  subject: string,
  htmlTemplate: string,
  variables?: Record<string, string>
) {
  try {
    // Get users with emails
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        email: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const recipients = users
      .filter((u) => u.email)
      .map((u) => ({
        email: u.email!,
        name: u.name || 'User',
        variables: {
          ...variables,
          userName: u.name || 'User',
          userEmail: u.email!,
        },
      }));

    const results = await sendBatchEmails({
      recipients,
      subject,
      template: htmlTemplate,
      defaultVariables: variables,
    });

    return results;
  } catch (error) {
    logger.error('Broadcast email failed', {}, error);
    throw error;
  }
}

// =============================================================================
// EMAIL VERIFICATION
// =============================================================================

export async function verifyEmailAddress(email: string): Promise<boolean> {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Additional checks can be added here (DNS verification, etc.)
  return true;
}

// =============================================================================
// EMAIL TEMPLATES (HTML)
// =============================================================================

export const EMAIL_TEMPLATES = {
  notification: (title: string, message: string, actionUrl?: string, actionLabel?: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px;">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      ${message}
                    </p>
                    ${actionUrl && actionLabel
      ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${actionUrl}" style="display: inline-block; padding: 14px 30px; background: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            ${actionLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                    `
      : ''
    }
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0; color: #6c757d; font-size: 14px;">
                      © ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
};