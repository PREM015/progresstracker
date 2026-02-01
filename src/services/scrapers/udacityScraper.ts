// src/services/scrapers/udacityScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class UdacityScraper extends BaseScraper {
  platformName = 'Udacity';
  platformSlug = 'udacity';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.accessToken) {
      return this.failure('Udacity requires OAuth authentication.');
    }
    if (!credentials.userId) {
      return this.failure('Udacity requires user ID in credentials.');
    }
    // Udacity API is very restrictive
    // Most useful data requires special permissions
    return this.notSupported('Udacity API requires special access.');
  }
}

export default UdacityScraper;