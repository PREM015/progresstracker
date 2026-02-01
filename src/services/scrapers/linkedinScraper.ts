// src/services/scrapers/linkedinScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class LinkedInScraper extends BaseScraper {
  platformName = 'LinkedIn';
  platformSlug = 'linkedin';
  protected baseUrl = 'https://api.linkedin.com/v2';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.accessToken) {
        return this.failure(
          'LinkedIn requires OAuth authentication. Please reconnect your account.'
        );
      }

      // LinkedIn API is very restrictive
      // Most useful data requires special permissions
      return this.notSupported(
        'LinkedIn API has limited access. Please track job applications manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default LinkedInScraper;