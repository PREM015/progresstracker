// src/services/scrapers/khanacademyScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class KhanAcademyScraper extends BaseScraper {
  platformName = 'Khan Academy';
  platformSlug = 'khanacademy';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.accessToken) {
      return this.failure('Khan Academy requires OAuth authentication.');
    }
    return this.notSupported('Khan Academy API requires special access.');
  }
}

export default KhanAcademyScraper;