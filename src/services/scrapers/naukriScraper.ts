// src/services/scrapers/naukriScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class NaukriScraper extends BaseScraper {
  platformName = 'Naukri';
  platformSlug = 'naukri';
  protected baseUrl = 'https://www.naukri.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      // Naukri requires authentication and scraping
      return this.notSupported(
        'Naukri requires login credentials and web scraping. Please track applications manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default NaukriScraper;