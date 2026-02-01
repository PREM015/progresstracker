// src/services/scrapers/diceScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class DiceScraper extends BaseScraper {
  platformName = 'Dice';
  platformSlug = 'dice';
  protected baseUrl = 'https://www.dice.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username || !credentials.password) {
      return this.failure('Dice requires username and password for login.');
    }

    try {
      // Dice requires authentication for application tracking
      return this.notSupported(
        'Dice requires login credentials for data access. Please track your tech job applications manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default DiceScraper;