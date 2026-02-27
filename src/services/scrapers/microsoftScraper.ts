// src/services/scrapers/microsoftScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class MicrosoftScraper extends BaseScraper {
  platformName = 'Microsoft Careers';
  platformSlug = 'microsoftcareers';
  protected baseUrl = 'https://careers.microsoft.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('Microsoft Careers requires a username for tracking.');
    }

    try {
      // Microsoft Careers doesn't have a public API for application tracking
      return this.notSupported(
        'Microsoft Careers does not provide public API access. Please track your applications, interviews, and referrals manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default MicrosoftScraper;