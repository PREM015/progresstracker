// src/services/scrapers/scrimbaScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class ScrimbaScraper extends BaseScraper {
  platformName = 'Scrimba';
  platformSlug = 'scrimba';

  async fetchData(_credentials: ScraperCredentials): Promise<ScraperResult> {
    // Scrimba requires API key or login
    // Most useful data requires special permissions
    if (_credentials.apiKey) {
      return this.notSupported(
        'Scrimba API requires special permissions. Please track course progress manually.'
      );
    }try {
      this.validateCredentials(_credentials, []);
    } catch (error) {
      return this.handleError(error);
    }
    return this.notSupported('Scrimba requires web scraping. Please track courses manually.');
  }
}

export default ScrimbaScraper;