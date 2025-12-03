// src/services/scrapers/codecademyScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class CodecademyScraper extends BaseScraper {
  platformName = 'Codecademy';
  platformSlug = 'codecademy';
  protected baseUrl = 'https://www.codecademy.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Codecademy doesn't have a public API
      return this.notSupported(
        'Codecademy requires web scraping. Please track course progress manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default CodecademyScraper;