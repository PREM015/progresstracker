// src/workers/scrapers/types.ts

export type TriggeredBy = 'user' | 'cron' | 'system';

export interface ScraperJobData {
    userId: string;
    platformId: string;
    userPlatformId: string;
    triggeredBy: TriggeredBy;
}

export interface ScraperJobResult {
    success: boolean;
    itemsCreated: number;
    itemsUpdated: number;
    duration: number;
}
