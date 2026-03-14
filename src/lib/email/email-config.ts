// src/lib/email/email-config.ts

// =============================================================================
// EMAIL CONFIGURATION
// =============================================================================

// Build a proper "Name <email>" from address from env vars
const fromEmail = process.env.BREVO_EMAIL || process.env.EMAIL_FROM || 'noreply@progresstracker.app';
const fromName = process.env.EMAIL_FROM_NAME || 'ProgressTracker';
const formattedFrom = `${fromName} <${fromEmail}>`;

export const emailConfig = {
  // From addresses
  from: {
    default: formattedFrom,
    support: process.env.EMAIL_FROM_SUPPORT
      ? `${fromName} Support <${process.env.EMAIL_FROM_SUPPORT}>`
      : `${fromName} Support <${fromEmail}>`,
    notifications: process.env.EMAIL_FROM_NOTIFICATIONS
      ? `${fromName} <${process.env.EMAIL_FROM_NOTIFICATIONS}>`
      : formattedFrom,
  },

  // Reply-to address
  replyTo: process.env.EMAIL_REPLY_TO || fromEmail,

  // App info
  appName: process.env.APP_NAME || 'ProgressTracker',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app',

  // Social links
  socialLinks: {
    twitter: 'https://twitter.com/progresstracker',
    github: 'https://github.com/progresstracker',
    discord: 'https://discord.gg/progresstracker',
  },
};

// =============================================================================
// PROVIDER CONFIGURATIONS (SMTP for Brevo)
// =============================================================================

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailProviderConfig {
  provider: 'brevo';
  from: {
    name: string;
    email: string;
  };
  smtp: SmtpConfig;
  dailyLimit: number;
}

export const brevoConfig: EmailProviderConfig = {
  provider: 'brevo',
  from: {
    name: fromName,
    email: fromEmail,
  },
  smtp: {
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // STARTTLS on port 587 (do NOT set secure: true here)
    auth: {
      user: process.env.BREVO_EMAIL || '',
      pass: process.env.BREVO_API_KEY || '',
    },
  },
  dailyLimit: 300,
};

export function getEmailConfig(): EmailProviderConfig {
  return brevoConfig;
}

// =============================================================================
// STARTUP VALIDATION
// =============================================================================

/**
 * Validates that all required Brevo SMTP environment variables are set.
 * Called inside EmailService constructor to catch misconfiguration early
 * instead of silently failing on the first email send.
 */
export function validateEmailEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!process.env.BREVO_EMAIL) missing.push('BREVO_EMAIL');
  if (!process.env.BREVO_API_KEY) missing.push('BREVO_API_KEY');
  if (!process.env.EMAIL_FROM_NAME) warnings.push('EMAIL_FROM_NAME (using default: ProgressTracker)');
  if (!process.env.NEXT_PUBLIC_APP_URL) warnings.push('NEXT_PUBLIC_APP_URL (verification links will use localhost)');

  // Warn if the key doesn't look like a Brevo SMTP key
  const apiKey = process.env.BREVO_API_KEY || '';
  if (apiKey && !apiKey.startsWith('xkeysib-')) {
    warnings.push(
      'BREVO_API_KEY does not look like a Brevo SMTP key (expected prefix: xkeysib-). ' +
      'Go to Brevo Dashboard → SMTP & API → SMTP tab to get your SMTP password.'
    );
  }

  return { valid: missing.length === 0, missing, warnings };
}