// src/types/scraper.ts

export interface ScraperCredentials {
  username?: string;
  token?: string;
  email?: string;
  password?: string;
  apiKey?: string;
  cookies?: string;
}

export interface ScraperEntry {
  date: Date;
  problems?: number;
  timeSpent?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface ScraperResult {
  success: boolean;
  entries: ScraperEntry[];
  error?: string;
  metadata?: {
    username?: string;
    profileUrl?: string;
    lastFetched?: Date;
    totalProblems?: number;
    rating?: number;
    rank?: string;
  };
}

export interface ScraperConfig {
  name: string;
  slug: string;
  baseUrl: string;
  rateLimit: {
    requests: number;
    window: number; // in ms
  };
  retries: number;
  timeout: number;
  requiresAuth: boolean;
  authType: 'api' | 'oauth' | 'scraping' | 'manual';
}

export interface ScraperStats {
  platform: string;
  totalProblems: number;
  rating?: number;
  rank?: string;
  streak?: number;
  lastActive?: Date;
}

export type ScraperFunction = (credentials: ScraperCredentials) => Promise<ScraperResult>;