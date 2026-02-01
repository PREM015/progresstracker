// src/services/scrapers/codecademyScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class CodecademyScraper extends BaseScraper {
  platformName = 'Codecademy';
  platformSlug = 'codecademy';
  protected baseUrl = 'https://www.codecademy.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('Codecademy requires a username for tracking.');
    }else if (!credentials.password) {
      return this.failure('Codecademy requires a password for tracking.');
    }

    try {
      this.validateCredentials(credentials, ['username']);

      return this.notSupported(
        'Codecademy requires web scraping. Please track course progress manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default CodecademyScraper;