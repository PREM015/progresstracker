// src/services/scrapers/udemyScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class UdemyScraper extends BaseScraper {
  platformName = 'Udemy';
  platformSlug = 'udemy';
  protected baseUrl = 'https://www.udemy.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('Udemy requires a username for tracking.');
    }

    try {
      // Udemy doesn't provide public API for course progress tracking
      return this.notSupported(
        'Udemy does not provide public API access for learning progress. Please track your enrolled courses, completed courses, certificates earned, and hours spent manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default UdemyScraper;