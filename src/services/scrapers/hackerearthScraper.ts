// src/services/scrapers/hackerearthScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class HackerEarthScraper extends BaseScraper {
  platformName = 'HackerEarth';
  platformSlug = 'hackerearth';
  protected baseUrl = 'https://www.hackerearth.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      const profileUrl = `${this.baseUrl}/@${username}`;

      // Try unofficial API
      try {
        const response = await this.get<{
          solved?: number;
          rating?: number;
          error?: string;
        }>(`https://hackerearth-api.vercel.app/user/${username}`);

        if (response && !response.error) {
          const entries =
            response.solved && response.solved > 0
              ? [
                  {
                    date: new Date(),
                    problems: response.solved,
                    notes: `Profile synced from HackerEarth`,
                  },
                ]
              : [];

          return this.success(entries, {
            username,
            profileUrl,
            rating: response.rating,
            totalProblems: response.solved,
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported(
        'HackerEarth requires web scraping for full data access. Please use manual tracking.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default HackerEarthScraper;