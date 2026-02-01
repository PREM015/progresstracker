// src/services/scrapers/spojScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class SPOJScraper extends BaseScraper {
  platformName = 'SPOJ';
  platformSlug = 'spoj';
  protected baseUrl = 'https://www.spoj.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Try unofficial API
      try {
        const response = await this.get<{
          solved?: number;
          rank?: number;
          error?: string;
        }>(`https://spoj-api.vercel.app/user/${username}`);

        if (response && !response.error) {
          const entries =
            response.solved && response.solved > 0
              ? [
                  {
                    date: new Date(),
                    problems: response.solved,
                    notes: `Total problems solved on SPOJ: ${response.solved}`,
                  },
                ]
              : [];

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

      return this.notSupported('SPOJ requires web scraping. Please use manual tracking.');
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default SPOJScraper;