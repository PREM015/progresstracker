// src/services/scrapers/udacityScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class UdacityScraper extends BaseScraper {
  platformName = 'Udacity';
  platformSlug = 'udacity';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.accessToken) {
      return this.failure('Udacity requires OAuth authentication.');
    }
    return this.notSupported('Udacity API requires special access.');
  }
}

export default UdacityScraper;