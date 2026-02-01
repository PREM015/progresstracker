// src/services/scrapers/glassdoorScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class GlassdoorScraper extends BaseScraper {
  platformName = 'Glassdoor';
  platformSlug = 'glassdoor';
  protected baseUrl = 'https://www.glassdoor.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('Glassdoor requires a username for tracking.');
    }

    try {
      // Glassdoor doesn't provide public API for job application tracking
      return this.notSupported(
        'Glassdoor does not provide public API access for application tracking. Please track your applications, company research, and interview preparations manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default GlassdoorScraper;