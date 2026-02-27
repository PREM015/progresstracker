// src/services/scrapers/ziprecruiterScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class ZipRecruiterScraper extends BaseScraper {
  platformName = 'ZipRecruiter';
  platformSlug = 'ziprecruiter';
  protected baseUrl = 'https://www.ziprecruiter.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('ZipRecruiter requires a username for tracking.');
    }

    try {
      // ZipRecruiter doesn't provide public API for application tracking
      return this.notSupported(
        'ZipRecruiter does not provide public API access. Please track your job applications, matches, and interview invites manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default ZipRecruiterScraper;