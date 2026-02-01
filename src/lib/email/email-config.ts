// src/lib/email/email-config.ts
import { Resend } from 'resend';

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
// RESEND CLIENT
// =============================================================================

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY || '');

// =============================================================================
// PROVIDER CONFIGURATIONS (for SMTP fallback)
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
  provider: 'gmail' | 'brevo' | 'sendgrid' | 'mailjet' | 'resend';
  from: {
    name: string;
    email: string;
  };
  smtp?: SmtpConfig;
  apiKey?: string;
  dailyLimit: number;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export const gmailConfig: EmailProviderConfig = {
  provider: 'gmail',
  from: {
    name: process.env.EMAIL_FROM_NAME || 'ProgressTracker',
    email: process.env.GMAIL_EMAIL || '',
  },
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_EMAIL || '',
      pass: process.env.GMAIL_APP_PASSWORD || '',
    },
  },
  dailyLimit: 500,
};

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

export const resendConfig: EmailProviderConfig = {
  provider: 'resend',
  from: {
    name: process.env.EMAIL_FROM_NAME || 'ProgressTracker',
    email: process.env.RESEND_EMAIL || 'noreply@progresstracker.app',
  },
  apiKey: process.env.RESEND_API_KEY,
  dailyLimit: 100,
};

const providers: Record<string, EmailProviderConfig> = {
  gmail: gmailConfig,
  brevo: brevoConfig,
  resend: resendConfig,
};

export function getEmailConfig(): EmailProviderConfig {
  const providerName = process.env.EMAIL_PROVIDER || (isDevelopment ? 'gmail' : 'resend');
  const config = providers[providerName.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown email provider: ${providerName}`);
  }
  return config;
}