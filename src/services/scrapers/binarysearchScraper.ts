// src/services/scrapers/binarysearchScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class BinarySearchScraper extends BaseScraper {
  platformName = 'BinarySearch';
  platformSlug = 'binarysearch';
  protected baseUrl = 'https://binarysearch.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);

      // BinarySearch has been acquired/changed
      return this.notSupported(
        'BinarySearch platform has changed. Please use manual tracking.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default BinarySearchScraper;