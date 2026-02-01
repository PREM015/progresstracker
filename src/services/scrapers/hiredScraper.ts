// src/services/scrapers/hiredScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class HiredScraper extends BaseScraper {
  platformName = 'Hired';
  platformSlug = 'hired';
  protected baseUrl = 'https://hired.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.accessToken) {
        return this.failure('Hired requires OAuth authentication.');
      }

      return this.notSupported(
        'Hired API requires special access. Please track interview requests manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default HiredScraper;