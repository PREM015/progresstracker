// src/services/scrapers/mlhScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class MLHScraper extends BaseScraper {
  platformName = 'MLH';
  platformSlug = 'mlh';
  protected baseUrl = 'https://mlh.io';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username || !credentials.password) {
      return this.failure('MLH requires username and password for login.');
    }

    
    try {
      if (!credentials.accessToken) {
        return this.failure('MLH requires OAuth authentication.');
      }

      return this.notSupported(
        'MLH requires OAuth. Please track hackathon participation manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default MLHScraper;