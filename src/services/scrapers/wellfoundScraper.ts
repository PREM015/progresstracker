// src/services/scrapers/wellfoundScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class WellfoundScraper extends BaseScraper {
  platformName = 'Wellfound';
  platformSlug = 'wellfound';
  protected baseUrl = 'https://wellfound.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.accessToken) {
        return this.failure('Wellfound requires OAuth authentication.');
      }

      return this.notSupported(
        'Wellfound API requires special access. Please track startup applications manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default WellfoundScraper;