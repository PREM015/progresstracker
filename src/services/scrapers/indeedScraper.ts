// src/services/scrapers/indeedScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class IndeedScraper extends BaseScraper {
  platformName = 'Indeed';
  platformSlug = 'indeed';
  protected baseUrl = 'https://www.indeed.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('Indeed requires a username for tracking.');
    }

    try {
      // Indeed doesn't provide public API for job application tracking
      return this.notSupported(
        'Indeed does not provide public API access for application tracking. Please track your job applications, responses, and interviews manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default IndeedScraper;