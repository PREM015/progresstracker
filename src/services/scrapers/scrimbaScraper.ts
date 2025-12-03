// src/services/scrapers/scrimbaScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class ScrimbaScraper extends BaseScraper {
  platformName = 'Scrimba';
  platformSlug = 'scrimba';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    return this.notSupported(
      'Scrimba requires web scraping. Please track courses manually.'
    );
  }
}

export default ScrimbaScraper;