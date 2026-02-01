// src/lib/email/index.ts
export { emailConfig, resend, getEmailConfig } from './email-config';
export type { EmailProviderConfig, SmtpConfig } from './email-config';
export { EmailService, emailService } from './email-service';
export type { SendEmailOptions, EmailResult } from './email-service';