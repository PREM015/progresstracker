// src/services/scrapers/edxScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class EdxScraper extends BaseScraper {
  platformName = 'edX';
  platformSlug = 'edx';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.accessToken) {
      return this.failure('edX requires OAuth authentication.');
    }
    if (!credentials.userId) {
      return this.failure('edX requires user ID in credentials.');
    }
    // edX API is very restrictive
    // Most useful data requires special permissions
    try {
     
      return this.notSupported(
        'edX API requires special permissions. Please track course progress manually.'
      );

    } catch (error) {
      return this.handleError(error);

    }
  
  }
}

export default EdxScraper;