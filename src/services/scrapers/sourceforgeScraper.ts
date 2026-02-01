// src/services/scrapers/sourceforgeScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class SourceforgeScraper extends BaseScraper {
  platformName = 'SourceForge';
  platformSlug = 'sourceforge';
  protected baseUrl = 'https://sourceforge.net';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);

      return this.notSupported(
        'SourceForge requires web scraping. Please track projects manually.'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default SourceforgeScraper;