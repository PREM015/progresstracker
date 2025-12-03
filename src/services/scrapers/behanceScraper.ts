// src/services/scrapers/behanceScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class BehanceScraper extends BaseScraper {
  platformName = 'Behance';
  platformSlug = 'behance';
  protected baseUrl = 'https://www.behance.net/v2';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.accessToken) {
        return this.failure('Behance requires OAuth authentication.');
      }

      return this.notSupported(
        'Behance API requires special access. Please track projects manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default BehanceScraper;