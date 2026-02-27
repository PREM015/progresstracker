// src/lib/email/email-config.ts

// =============================================================================
// EMAIL CONFIGURATION
// =============================================================================

export const emailConfig = {
  // From addresses
  from: {
    default: process.env.EMAIL_FROM || 'ProgressTracker <noreply@progresstracker.app>',
    support: process.env.EMAIL_FROM_SUPPORT || 'ProgressTracker Support <support@progresstracker.app>',
    notifications: process.env.EMAIL_FROM_NOTIFICATIONS || 'ProgressTracker <notifications@progresstracker.app>',
  },

  // Reply-to address
  replyTo: process.env.EMAIL_REPLY_TO || 'support@progresstracker.app',

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
    name: process.env.EMAIL_FROM_NAME || 'ProgressTracker',
    email: process.env.BREVO_EMAIL || 'noreply@progresstracker.app',
  },
  smtp: {
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
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