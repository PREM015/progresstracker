// src/services/scrapers/internshalaScaper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class InternshalaScaper extends BaseScraper {
  platformName = 'Internshala';
  platformSlug = 'internshala';
  protected baseUrl = 'https://internshala.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username || !credentials.password) {
      return this.failure('Internshala requires username and password for login.');
    }

    try {
      return this.notSupported(
        'Internshala requires login credentials. Please track internship applications manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default InternshalaScaper;