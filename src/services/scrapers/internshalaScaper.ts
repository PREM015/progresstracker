// src/services/scrapers/internshalaScaper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class InternshalaScaper extends BaseScraper {
  platformName = 'Internshala';
  platformSlug = 'internshala';
  protected baseUrl = 'https://internshala.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      // Internshala requires authentication for application data
      return this.notSupported(
        'Internshala requires login credentials. Please track internship applications manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default InternshalaScaper;