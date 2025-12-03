// src/services/scrapers/edxScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class EdxScraper extends BaseScraper {
  platformName = 'edX';
  platformSlug = 'edx';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.accessToken) {
      return this.failure('edX requires OAuth authentication.');
    }
    return this.notSupported('edX API requires special access.');
  }
}

export default EdxScraper;