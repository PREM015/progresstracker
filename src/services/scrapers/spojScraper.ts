// src/services/scrapers/spojScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class SPOJScraper extends BaseScraper {
  platformName = 'SPOJ';
  platformSlug = 'spoj';
  protected baseUrl = 'https://www.spoj.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // SPOJ doesn't have a public API, need to scrape
      // Try unofficial API first
      try {
        const response = await this.get<any>(
          `https://spoj-api.vercel.app/user/${username}`
        );

        if (response && !response.error) {
          const entries = [{
            date: new Date(),
            problems: response.solved || 0,
            notes: `Total problems solved on SPOJ: ${response.solved || 0}`,
          }];

          return this.success(entries, {
            username,
            profileUrl: `${this.baseUrl}/users/${username}`,
            totalProblems: response.solved,
            rank: response.rank?.toString(),
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported(
        'SPOJ requires web scraping. Please use manual tracking.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default SPOJScraper;