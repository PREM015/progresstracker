// src/lib/email.ts

import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Send email
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, html, text, from } = options;

  try {
    await transporter.sendMail({
      from: from || process.env.SMTP_FROM || 'CodeSync <noreply@codesync.pro>',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Email templates
 */
export const emailTemplates = {
  /**
   * Welcome email
   */
  welcome: (name: string, username: string) => ({
    subject: 'Welcome to CodeSync Pro! 🚀',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome to CodeSync Pro!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for joining CodeSync Pro. We're excited to help you track your coding progress across multiple platforms.</p>
        <p>Your username: <strong>@${username}</strong></p>
        <p>Get started by:</p>
        <ul>
          <li>Connecting your platforms</li>
          <li>Setting your first goal</li>
          <li>Logging your daily progress</li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Go to Dashboard
        </a>
        <p>Happy coding! 💻</p>
        <p>- The CodeSync Team</p>
      </div>
    `,
  }),

  /**
   * Password reset email
   */
  passwordReset: (name: string, resetUrl: string) => ({
    subject: 'Reset Your CodeSync Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Reset Your Password</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>- The CodeSync Team</p>
      </div>
    `,
  }),

  /**
   * Weekly report email
   */
  weeklyReport: (name: string, stats: any) => ({
    subject: '📊 Your Weekly Progress Report',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Your Weekly Progress Report</h1>
        <p>Hi ${name},</p>
        <p>Here's a summary of your progress this week:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Problems Solved:</strong> ${stats.problemsSolved}</p>
          <p><strong>Time Spent:</strong> ${stats.timeSpent} hours</p>
          <p><strong>Current Streak:</strong> ${stats.streak} days 🔥</p>
          <p><strong>Goals Completed:</strong> ${stats.goalsCompleted}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/analytics" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Full Report
        </a>
        <p>Keep up the great work! 💪</p>
        <p>- The CodeSync Team</p>
      </div>
    `,
  }),

  /**
   * Achievement unlocked email
   */
  achievementUnlocked: (name: string, achievement: any) => ({
    subject: `🏆 Achievement Unlocked: ${achievement.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">🏆 Achievement Unlocked!</h1>
        <p>Hi ${name},</p>
        <p>Congratulations! You've unlocked a new achievement:</p>
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <h2 style="color: #92400e; margin: 0;">${achievement.title}</h2>
          <p style="color: #78350f;">${achievement.description}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/achievements" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View All Achievements
        </a>
        <p>Keep crushing your goals! 🎯</p>
        <p>- The CodeSync Team</p>
      </div>
    `,
  }),
};