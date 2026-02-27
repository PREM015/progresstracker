// src/services/scrapers/linkedinlearningScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class LinkedInLearningScraper extends BaseScraper {
  platformName = 'LinkedIn Learning';
  platformSlug = 'linkedinlearning';
  protected baseUrl = 'https://www.linkedin.com/learning';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.accessToken) {
        return this.failure('LinkedIn Learning requires OAuth authentication through LinkedIn.');
      }

      // LinkedIn Learning API is part of LinkedIn's restricted API
      return this.notSupported(
        'LinkedIn Learning API requires special permissions through LinkedIn. Please track your completed courses, certificates, and learning hours manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default LinkedInLearningScraper;