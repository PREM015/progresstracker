// src/services/scrapers/hackerearthScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class HackerEarthScraper extends BaseScraper {
  platformName = 'HackerEarth';
  platformSlug = 'hackerearth';
  protected baseUrl = 'https://www.hackerearth.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Try to fetch profile data
      // HackerEarth doesn't have a public API, requires scraping
      const profileUrl = `${this.baseUrl}/@${username}`;

      // Attempt to get public profile data
      try {
        const response = await this.get<any>(
          `https://hackerearth-api.vercel.app/user/${username}`
        );

        if (response && !response.error) {
          const entries = [{
            date: new Date(),
            problems: response.solved || 0,
            notes: `Profile synced from HackerEarth`,
          }];

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
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default HackerEarthScraper;