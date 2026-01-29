// ===== FILE: src/types/next-auth.d.ts =====
// NextAuth.js type extensions

import type { DefaultSession, DefaultUser } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extended Session interface
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      username?: string | null;
      role: 'user' | 'moderator' | 'admin' | 'superadmin';
      isAdmin: boolean;
      isSuperAdmin: boolean;
      isVerified: boolean;
      currentStreak: number;
      totalPoints: number;
      timezone: string;
      preferredLanguage: string;
    } & DefaultSession['user'];
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }

  /**
   * Extended User interface
   */
  interface User extends DefaultUser {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    username?: string | null;
    role: 'user' | 'moderator' | 'admin' | 'superadmin';
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isVerified: boolean;
    isActive: boolean;
    isBanned: boolean;
    currentStreak: number;
    longestStreak: number;
    totalPoints: number;
    totalProblems: number;
    totalCommits: number;
    totalAchievements: number;
    timezone: string;
    preferredLanguage: string;
    emailVerified: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * Extended Account interface for OAuth
   */
  interface Account {
    provider: string;
    type: string;
    providerAccountId: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
    session_state?: string;
  }

  /**
   * Extended Profile interface for OAuth providers
   */
  interface Profile {
    id?: string;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    image?: string;
    avatar_url?: string;
    login?: string;
    username?: string;
    locale?: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT interface
   */
  interface JWT extends DefaultJWT {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    username?: string | null;
    role: 'user' | 'moderator' | 'admin' | 'superadmin';
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isVerified: boolean;
    currentStreak: number;
    totalPoints: number;
    timezone: string;
    preferredLanguage: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    provider?: string;
    providerAccountId?: string;
  }
}

// Extend the global namespace for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // NextAuth
      NEXTAUTH_URL: string;
      NEXTAUTH_SECRET: string;
      
      // OAuth Providers
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      GITHUB_CLIENT_ID?: string;
      GITHUB_CLIENT_SECRET?: string;
      LINKEDIN_CLIENT_ID?: string;
      LINKEDIN_CLIENT_SECRET?: string;
      
      // Database
      DATABASE_URL: string;
      DIRECT_URL?: string;
      
      // Redis
      REDIS_URL?: string;
      UPSTASH_REDIS_REST_URL?: string;
      UPSTASH_REDIS_REST_TOKEN?: string;
      
      // App
      NODE_ENV: 'development' | 'production' | 'test';
      APP_URL: string;
      
      // Email
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_USER?: string;
      SMTP_PASSWORD?: string;
      EMAIL_FROM?: string;
      
      // Storage
      S3_BUCKET?: string;
      S3_REGION?: string;
      S3_ACCESS_KEY?: string;
      S3_SECRET_KEY?: string;
      
      // Stripe
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
      
      // Sentry
      SENTRY_DSN?: string;
      
      // Analytics
      NEXT_PUBLIC_GA_ID?: string;
    }
  }
}

export {};