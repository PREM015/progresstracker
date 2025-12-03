// src/services/scrapers/instahyreScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class InstahyreScraper extends BaseScraper {
  platformName = 'Instahyre';
  platformSlug = 'instahyre';
  protected baseUrl = 'https://www.instahyre.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      // Instahyre requires login
      return this.notSupported(
        'Instahyre requires login credentials. Please track job matches manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default InstahyreScraper;