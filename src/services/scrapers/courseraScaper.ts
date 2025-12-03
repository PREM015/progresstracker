// src/services/scrapers/courseraScaper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class CourseraScraper extends BaseScraper {
  platformName = 'Coursera';
  platformSlug = 'coursera';
  protected baseUrl = 'https://api.coursera.org';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.accessToken) {
        return this.failure('Coursera requires OAuth authentication.');
      }

      return this.notSupported(
        'Coursera API requires special permissions. Please track course progress manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default CourseraScraper;