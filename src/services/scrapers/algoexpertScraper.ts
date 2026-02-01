// src/services/scrapers/algoexpertScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class AlgoExpertScraper extends BaseScraper {
  platformName = 'AlgoExpert';
  platformSlug = 'algoexpert';
  protected baseUrl = 'https://www.algoexpert.io';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    if (!credentials.username) {
      return this.failure('AlgoExpert requires a username for tracking.');
    }
    try {
      // AlgoExpert is a paid platform without public API
      // Users need to track their progress manually
      return this.notSupported(
        'AlgoExpert is a premium platform without public API. Please track your completed questions manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default AlgoExpertScraper;