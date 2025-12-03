// src/services/scrapers/linkedinScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class LinkedInScraper extends BaseScraper {
  platformName = 'LinkedIn';
  platformSlug = 'linkedin';
  protected baseUrl = 'https://api.linkedin.com/v2';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      if (!credentials.accessToken) {
        return this.failure('LinkedIn requires OAuth authentication. Please reconnect your account.');
      }

      // LinkedIn API requires OAuth and has limited data access
      const profileResponse = await this.get<any>(
        `${this.baseUrl}/me`,
        {},
        { Authorization: `Bearer ${credentials.accessToken}` }
      );

      // LinkedIn API is very restrictive
      // Most useful data requires special permissions
      
      return this.notSupported(
        'LinkedIn API has limited access. Please track job applications manually.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default LinkedInScraper;