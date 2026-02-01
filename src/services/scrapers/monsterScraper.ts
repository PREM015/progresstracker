// src/services/scrapers/monsterScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class MonsterScraper extends BaseScraper {
  platformName = 'Monster';
  platformSlug = 'monster';
  protected baseUrl = 'https://www.monster.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('Monster requires a username for tracking.');
    }

    try {
      // Monster doesn't provide public API for job application tracking
      return this.notSupported(
        'Monster does not provide public API access for application tracking. Please track your job applications and profile views manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default MonsterScraper;