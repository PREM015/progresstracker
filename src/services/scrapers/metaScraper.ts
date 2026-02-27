// src/services/scrapers/metaScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class MetaScraper extends BaseScraper {
  platformName = 'Meta Careers';
  platformSlug = 'metacareers';
  protected baseUrl = 'https://www.metacareers.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if( !credentials.username) {
      return this.failure('Meta Careers requires a username for tracking.');
    }
    try {
      // Meta Careers doesn't have a public API for application tracking
      return this.notSupported(
        'Meta Careers does not provide public API access. Please track your applications, recruiter calls, and interview progress manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default MetaScraper;