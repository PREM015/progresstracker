// src/services/scrapers/instahyreScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class InstahyreScraper extends BaseScraper {
  platformName = 'Instahyre';
  platformSlug = 'instahyre';
  protected baseUrl = 'https://www.instahyre.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username || !credentials.password) {
      return this.failure('Instahyre requires username and password for login.');
    }

    try {
      return this.notSupported(
        'Instahyre requires login credentials. Please track job matches manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default InstahyreScraper;