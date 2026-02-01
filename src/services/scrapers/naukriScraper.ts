// src/services/scrapers/naukriScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class NaukriScraper extends BaseScraper {
  platformName = 'Naukri';
  platformSlug = 'naukri';
  protected baseUrl = 'https://www.naukri.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
   if (!credentials.username || !credentials.password) {
      return this.failure('Naukri requires username and password for login.');
    }
    try {
      return this.notSupported(
        'Naukri requires login credentials and web scraping. Please track applications manually.'
     
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default NaukriScraper;