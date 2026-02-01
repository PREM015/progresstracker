// src/services/scrapers/angellistScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class AngelListScraper extends BaseScraper {
  platformName = 'AngelList';
  platformSlug = 'angellist';
  protected baseUrl = 'https://angel.co';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username || !credentials.password) {
      return this.failure('AngelList requires username and password for login.');
    }

    try {
      // AngelList (now Wellfound) requires OAuth for data access
      if (!credentials.accessToken) {
        return this.failure('AngelList requires OAuth authentication.');
      }

      return this.notSupported(
        'AngelList has been rebranded to Wellfound. Please use the Wellfound integration or track startup applications manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default AngelListScraper;