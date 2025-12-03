// src/services/scrapers/pluralsightScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class PluralsightScraper extends BaseScraper {
  platformName = 'Pluralsight';
  platformSlug = 'pluralsight';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    return this.notSupported(
      'Pluralsight requires API key or login. Please track courses manually.'
    );
  }
}

export default PluralsightScraper;