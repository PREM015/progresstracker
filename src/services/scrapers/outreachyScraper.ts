// src/services/scrapers/outreachyScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class OutreachyScraper extends BaseScraper {
  platformName = 'Outreachy';
  platformSlug = 'outreachy';
  protected baseUrl = 'https://www.outreachy.org';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('Outreachy requires a username for tracking.');
    }

    try {
      this.validateCredentials(credentials, ['username']);

      // Outreachy doesn't have a public API
      return this.notSupported(
        'Outreachy does not provide public API access. Please track your initial applications, contributions, and internship status manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default OutreachyScraper;