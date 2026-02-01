// src/services/scrapers/hackathoncomScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class HackathonComScraper extends BaseScraper {
  platformName = 'Hackathon.com';
  platformSlug = 'hackathoncom';
  protected baseUrl = 'https://www.hackathon.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('Hackathon.com requires a username for tracking.');
    }else if (!credentials.password) {
      return this.failure('Hackathon.com requires a password for tracking.');
    }

    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      if (!username) {
        return this.failure('Hackathon.com requires a valid username for tracking.');
      }

      // Hackathon.com has limited public API
      return this.notSupported(
        'Hackathon.com requires web scraping for participation data. Please track your hackathon submissions and awards manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default HackathonComScraper;