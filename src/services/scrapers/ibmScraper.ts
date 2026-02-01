// src/services/scrapers/ibmScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class IBMScraper extends BaseScraper {
  platformName = 'IBM Careers';
  platformSlug = 'ibmcareers';
  protected baseUrl = 'https://www.ibm.com/careers';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('IBM Careers requires a username for tracking.');
    }

    try {
      // IBM Careers doesn't have a public API for application tracking
      return this.notSupported(
        'IBM Careers does not provide public API access. Please track your applications and interview progress manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default IBMScraper;