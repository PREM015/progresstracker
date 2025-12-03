// src/services/scrapers/mlhScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class MLHScraper extends BaseScraper {
  platformName = 'MLH';
  platformSlug = 'mlh';
  protected baseUrl = 'https://mlh.io';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.accessToken) {
        return this.failure('MLH requires OAuth authentication.');
      }

      return this.notSupported(
        'MLH requires OAuth. Please track hackathon participation manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default MLHScraper;