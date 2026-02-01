// src/services/scrapers/behanceScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class BehanceScraper extends BaseScraper {
  platformName = 'Behance';
  platformSlug = 'behance';
  protected baseUrl = 'https://www.behance.net/v2';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username || !credentials.password) {
      return this.failure('Behance requires username and password for login.');
    }

    
    try {
      if (!credentials.accessToken) {
        return this.failure('Behance requires OAuth authentication.');
      }

      return this.notSupported(
        'Behance API requires special access. Please track projects manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default BehanceScraper;