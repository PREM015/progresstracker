// src/services/scrapers/khanacademyScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class KhanAcademyScraper extends BaseScraper {
  platformName = 'Khan Academy';
  platformSlug = 'khanacademy';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.accessToken) {
      return this.failure('Khan Academy requires OAuth authentication.');
    }
    try {
      this.validateCredentials(credentials, ['accessToken']);
    } catch (error) {
      return this.handleError(error);
    }
    // Khan Academy API is very restrictive
    // Most useful data requires special permissions
    
    return this.notSupported('Khan Academy API requires special access.');
  }
}

export default KhanAcademyScraper;