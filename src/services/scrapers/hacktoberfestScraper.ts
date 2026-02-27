// src/services/scrapers/hacktoberfestScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class HacktoberfestScraper extends BaseScraper {
  platformName = 'Hacktoberfest';
  platformSlug = 'hacktoberfest';
  protected baseUrl = 'https://hacktoberfest.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username || !credentials.password) {
      return this.failure('Hacktoberfest requires username and password for login.');
    }

    else if (!credentials.accessToken && !credentials.token) {
      return this.failure('Hacktoberfest requires GitHub OAuth connection.');
    }

    try {
      if (!credentials.accessToken && !credentials.token) {
        return this.failure('Hacktoberfest requires GitHub OAuth connection.');
      }

      return this.notSupported(
        'Hacktoberfest tracking via GitHub PRs. Please track manually or sync via GitHub.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default HacktoberfestScraper;