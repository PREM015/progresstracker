// src/services/scrapers/binarysearchScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class BinarySearchScraper extends BaseScraper {
  platformName = 'BinarySearch';
  platformSlug = 'binarysearch';
  protected baseUrl = 'https://binarysearch.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // BinarySearch has been acquired/changed
      // This is a placeholder implementation
      return this.notSupported(
        'BinarySearch platform has changed. Please use manual tracking.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default BinarySearchScraper;