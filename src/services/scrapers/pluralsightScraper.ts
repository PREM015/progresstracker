// src/services/scrapers/pluralsightScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class PluralsightScraper extends BaseScraper {
  platformName = 'Pluralsight';
  platformSlug = 'pluralsight';

  async fetchData(_credentials: ScraperCredentials): Promise<ScraperResult> {
    // Pluralsight requires API key or login
    // Most useful data requires special permissions
    if (_credentials.apiKey) {
      return this.notSupported(
        'Pluralsight API requires special permissions. Please track course progress manually.'
      );
    }try {
      this.validateCredentials(_credentials, []);
    } catch (error) {
      return this.handleError(error);
    }
    return this.notSupported(
      'Pluralsight requires API key or login. Please track courses manually.'
    );
  }
}

export default PluralsightScraper;